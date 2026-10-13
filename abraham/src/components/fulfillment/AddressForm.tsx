import { useState, type FormEvent } from 'react';
import { neighborhoods } from '@/data/branches';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField } from '@/components/ui/Field';
import type { Address } from '@/types';

const labels = ['Casa', 'Trabajo', 'Otro'];

interface Props {
  initial?: Address;
  onSave: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function AddressForm({ initial, onSave, onCancel, submitLabel = 'Guardar dirección' }: Props) {
  const [label, setLabel] = useState(initial?.label ?? 'Casa');
  const [street, setStreet] = useState(initial?.street ?? '');
  const [number, setNumber] = useState(initial?.number ?? '');
  const [apartment, setApartment] = useState(initial?.apartment ?? '');
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (street.trim().length < 3) next.street = 'Ingresá la calle.';
    if (!/^\d{1,5}$/.test(number.trim())) next.number = 'Ingresá la altura en números.';
    if (!neighborhood) next.neighborhood = 'Elegí un barrio.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({
      id: initial?.id ?? `addr-${Date.now()}`,
      label,
      street: street.trim(),
      number: number.trim(),
      apartment: apartment.trim() || undefined,
      neighborhood,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex gap-2" role="radiogroup" aria-label="Tipo de dirección">
        {labels.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={label === l}
            onClick={() => setLabel(l)}
            className={cn(
              'h-10 rounded-full px-4 text-callout font-medium transition-colors',
              label === l ? 'bg-ink text-white' : 'bg-white text-ink shadow-hairline hover:bg-mist',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_112px] gap-3">
        <TextField
          label="Calle"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          error={errors.street}
          autoComplete="address-line1"
          placeholder="Ej. Av. Santa Fe"
        />
        <TextField
          label="Altura"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          error={errors.number}
          inputMode="numeric"
          placeholder="1234"
        />
      </div>
      <TextField
        label="Piso / Depto."
        optional
        value={apartment}
        onChange={(e) => setApartment(e.target.value)}
        placeholder="Ej. 4° B"
      />
      <SelectField
        label="Barrio"
        value={neighborhood}
        onChange={(e) => setNeighborhood(e.target.value)}
        options={neighborhoods}
        placeholder="Elegí tu barrio"
        error={errors.neighborhood}
      />
      <TextArea
        label="Indicaciones para el repartidor"
        optional
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Timbre, portería, referencias"
        maxLength={140}
      />
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="dark" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
