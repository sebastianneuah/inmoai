import { redirect } from "next/navigation";

/** La vieja URL del checkout ahora es la pestaña Pedido de la app. */
export default function CheckoutViejo() {
  redirect("/pedido");
}
