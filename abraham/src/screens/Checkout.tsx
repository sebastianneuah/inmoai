import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { branches } from '@/data/branches';
import { paymentMethods } from '@/data/payments';
import { productById } from '@/data/products';
import { useCheckoutSummary } from '@/hooks/useCheckoutSummary';
import { formatAddress, isCovered } from '@/lib/coverage';
import { formatPrice } from '@/lib/format';
import { describeModifiers, lineTotal } from '@/lib/pricing';
import { submitOrder } from '@/services/orders';
import { useCart } from '@/store/cart';
import { useOrders } from '@/store/orders';
import { useSession } from '@/store/session';
import { Button } from '@/components/ui/Button';
import { ChoiceRow } from '@/components/ui/Choice';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { Segmented } from '@/components/ui/Segmented';
import { PageHeader } from '@/components/layout/PageHeader';
import { TotalsSummary } from '@/components/cart/TotalsSummary';
import { AddressForm } from '@/components/fulfillment/AddressForm';
import { BranchOption } from '@/components/fulfillment/BranchOption';
import { modeOptions } from '@/components/fulfillment/LocationSheet';
import type { PaymentMethodId } from '@/types';

type Errors = Partial<Record<'branch' | 'address' | 'name' | 'phone' | 'email' | 'payment' | 'submit', string>>;

function Step({ n, title, children, id }: { n: number; title: string; children: ReactNode; id: string }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line py-7 first:border-0 first:pt-2 lg:scroll-mt-28">
      <h2 className="flex items-center gap-3 text-headline font-semibold">
        <span className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-ink text-caption font-medium text-white">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { lines, mode, branch, coupon, totals } = useCheckoutSummary();
  const session = useSession();
  const clearCart = useCart((s) => s.clear);
  const addOrder = useOrders((s) => s.addOrder);

  const [name, setName] = useState(session.profile.name);
  const [phone, setPhone] = useState(session.profile.phone);
  const [email, setEmail] = useState(session.profile.email);
  const [payment, setPayment] = useState<PaymentMethodId>('cash');
  const [addingAddress, setAddingAddress] = useState(session.addresses.length === 0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const placed = useRef(false);

  const address = session.addresses.find((a) => a.id === session.addressId);

  useEffect(() => {
    if (session.addresses.length === 0) setAddingAddress(true);
  }, [session.addresses.length]);

  if (lines.length === 0 && !placed.current) return <Navigate to="/carrito" replace />;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!branch) e.branch = 'Elegí una sucursal.';
    else if (!branch.active) e.branch = 'Esta sucursal todavía no recibe pedidos.';
    if (mode === 'delivery') {
      if (!address) e.address = 'Elegí o agregá una dirección de entrega.';
      else if (!isCovered(address, branch)) e.address = `La dirección está fuera de la zona de entrega de ${branch?.shortName}.`;
    }
    if (name.trim().length < 2) e.name = 'Ingresá tu nombre.';
    if (phone.replace(/\D/g, '').length < 8) e.phone = 'Ingresá un teléfono válido, con código de área.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Revisá el formato del email.';
    const pm = paymentMethods.find((p) => p.id === payment);
    if (!pm?.available) e.payment = 'Elegí un medio de pago disponible.';
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      const target = { branch: 'step-entrega', address: 'step-entrega', name: 'step-datos', phone: 'step-datos', email: 'step-datos', payment: 'step-pago' }[
        first as Exclude<keyof Errors, 'submit'>
      ];
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setSubmitting(true);
    try {
      const order = await submitOrder({
        lines,
        mode,
        branchId: branch!.id,
        address: mode === 'delivery' ? address : undefined,
        customer: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
        couponCode: coupon?.code,
        paymentMethod: payment,
      });
      session.updateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      addOrder(order);
      placed.current = true;
      clearCart();
      navigate(`/confirmacion/${order.id}`, { replace: true });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No pudimos registrar el pedido. Intentá de nuevo.' });
      setSubmitting(false);
    }
  };

  const cta = (
    <Button block onClick={submit} loading={submitting} className="justify-between px-6">
      {submitting ? (
        'Registrando pedido…'
      ) : (
        <span className="flex w-full items-center justify-between">
          <span>Confirmar pedido</span>
          <span className="tabular">{formatPrice(totals.total)}</span>
        </span>
      )}
    </Button>
  );

  return (
    <div className="pb-[calc(120px+var(--safe-bottom))] lg:pb-20">
      <PageHeader title="Finalizar pedido" fallback="/carrito" desktopTitle={false} />

      <div className="mx-auto max-w-content lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:px-8 lg:pt-4">
        <div className="px-gutter lg:px-0">
          <h1 className="hidden pb-6 text-display font-semibold lg:block">Finalizar pedido</h1>

          <Notice className="mb-6">
            Pedido de demostración: no se envía a la cocina y no se realiza ningún cobro.
          </Notice>

          <Step n={1} title="Entrega" id="step-entrega">
            <Segmented label="Modo de entrega" value={mode} onChange={session.setMode} options={modeOptions} />

            <h3 className="eyebrow mb-3 mt-6 text-stone">{mode === 'delivery' ? 'Cocina' : 'Sucursal de retiro'}</h3>
            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Sucursal">
              {branches.map((b) => (
                <BranchOption
                  key={b.id}
                  branch={b}
                  mode={mode}
                  selected={b.id === session.branchId}
                  onSelect={() => {
                    session.setBranch(b.id);
                    setErrors((x) => ({ ...x, branch: undefined, address: undefined }));
                  }}
                />
              ))}
            </div>
            {errors.branch && <p className="mt-2 text-footnote text-red">{errors.branch}</p>}

            {mode === 'delivery' && (
              <>
                <h3 className="eyebrow mb-1 mt-6 text-stone">Dirección</h3>
                {session.addresses.length > 0 && (
                  <div className="divide-y divide-line" role="radiogroup" aria-label="Direcciones guardadas">
                    {session.addresses.map((a) => {
                      const covered = isCovered(a, branch);
                      return (
                        <ChoiceRow
                          key={a.id}
                          type="radio"
                          name="checkout-address"
                          checked={a.id === session.addressId}
                          onChange={() => {
                            session.selectAddress(a.id);
                            setErrors((x) => ({ ...x, address: undefined }));
                          }}
                          title={formatAddress(a)}
                          description={
                            covered ? (
                              `${a.label} · ${a.neighborhood}`
                            ) : (
                              <span className="text-red">{a.neighborhood} · Fuera de zona</span>
                            )
                          }
                        />
                      );
                    })}
                  </div>
                )}
                {addingAddress ? (
                  <div className="mt-3 rounded-lg bg-white p-4 shadow-hairline">
                    <AddressForm
                      onSave={(a) => {
                        session.saveAddress(a);
                        setAddingAddress(false);
                        setErrors((x) => ({ ...x, address: undefined }));
                      }}
                      onCancel={session.addresses.length ? () => setAddingAddress(false) : undefined}
                      submitLabel="Usar esta dirección"
                    />
                  </div>
                ) : (
                  <Button variant="secondary" size="md" className="mt-2" leading={<Icon icon={Plus} size={16} />} onClick={() => setAddingAddress(true)}>
                    Nueva dirección
                  </Button>
                )}
                {errors.address && (
                  <Notice tone="error" className="mt-3">
                    {errors.address}
                  </Notice>
                )}
              </>
            )}
          </Step>

          <Step n={2} title="Tus datos" id="step-datos">
            <div className="flex flex-col gap-4">
              <TextField
                label="Nombre y apellido"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                autoComplete="name"
              />
              <TextField
                label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="11 2345 6789"
                hint="Lo usamos solo para coordinar la entrega."
              />
              <TextField
                label="Email"
                optional
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                type="email"
                inputMode="email"
                autoComplete="email"
              />
            </div>
          </Step>

          <Step n={3} title="Pago" id="step-pago">
            <div className="divide-y divide-line overflow-hidden rounded-lg bg-white px-4 shadow-hairline" role="radiogroup" aria-label="Medio de pago">
              {paymentMethods.map((p) => (
                <ChoiceRow
                  key={p.id}
                  type="radio"
                  name="payment"
                  checked={payment === p.id}
                  disabled={!p.available}
                  onChange={() => setPayment(p.id)}
                  title={p.name}
                  description={p.description}
                />
              ))}
            </div>
            {errors.payment && <p className="mt-2 text-footnote text-red">{errors.payment}</p>}
            <p className="mt-3 text-footnote text-stone">
              El pago online se habilitará cuando la integración con Mercado Pago esté verificada.
            </p>
          </Step>
        </div>

        <aside className="px-gutter lg:sticky lg:top-[96px] lg:self-start lg:px-0">
          <section className="border-t border-line py-7 lg:rounded-xl lg:border-0 lg:bg-white lg:p-6 lg:shadow-hairline">
            <h2 className="flex items-center gap-3 text-headline font-semibold">
              <span className="tabular flex h-6 w-6 items-center justify-center rounded-full bg-ink text-caption font-medium text-white lg:hidden">
                4
              </span>
              Revisá tu pedido
            </h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => {
                const p = productById(l.productId);
                const mods = describeModifiers(l.modifiers);
                return (
                  <li key={l.key} className="flex justify-between gap-4 text-callout">
                    <span className="min-w-0">
                      <span className="tabular text-stone">{l.quantity}×</span> {p?.name}
                      {mods && <span className="block text-footnote text-stone">{mods}</span>}
                      {l.notes && <span className="block text-footnote italic text-stone">“{l.notes}”</span>}
                    </span>
                    <span className="tabular shrink-0">{formatPrice(lineTotal(l))}</span>
                  </li>
                );
              })}
            </ul>
            <TotalsSummary
              className="mt-4 border-t border-line pt-3"
              totals={totals}
              mode={mode}
              couponCode={totals.couponValid ? coupon?.code : undefined}
            />
            {coupon && !totals.couponValid && (
              <p className="mt-2 text-footnote text-warning">El cupón {coupon.code} no aplica a este pedido.</p>
            )}
            {errors.submit && (
              <Notice tone="error" className="mt-4">
                {errors.submit}
              </Notice>
            )}
            <div className="mt-6 hidden lg:block">{cta}</div>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-gutter pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-xl lg:hidden">
        {cta}
        <p className="mt-2 text-center text-caption text-stone">Simulación: no se realiza ningún cobro.</p>
      </div>
    </div>
  );
}
