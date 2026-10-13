import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Profile() {
  const { profile, updateProfile } = useSession();
  const showToast = useUi((s) => s.showToast);
  const navigate = useNavigate();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Ingresá tu nombre.';
    if (phone && phone.replace(/\D/g, '').length < 8) next.phone = 'Ingresá un teléfono válido, con código de área.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Revisá el formato del email.';
    setErrors(next);
    if (Object.keys(next).length) return;
    updateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    showToast('Datos guardados');
    navigate('/cuenta');
  };

  return (
    <>
      <PageHeader title="Mis datos" fallback="/cuenta" />
      <form onSubmit={submit} noValidate className="mx-auto flex max-w-[560px] flex-col gap-4 px-gutter pt-4 lg:px-8">
        <TextField label="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
        <TextField
          label="Teléfono"
          optional
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          placeholder="11 2345 6789"
          autoComplete="tel"
        />
        <TextField
          label="Email"
          optional
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <p className="text-footnote text-stone">Se usan para completar tus pedidos. Se guardan solo en este dispositivo.</p>
        <Button type="submit" variant="dark" block className="mt-2">
          Guardar
        </Button>
      </form>
    </>
  );
}
