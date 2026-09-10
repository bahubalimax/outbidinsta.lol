import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutReturn } from "@/components/checkout-return";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ bid?: string }>;
}) {
  const { bid } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-10 pb-16">
      <h1 className="mb-4 text-center text-xl font-semibold">Checkout</h1>
      {bid ? (
        <CheckoutReturn bidId={bid} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Missing bid reference.{" "}
          <Link href="/" className="text-primary">
            Go home
          </Link>
          .
        </p>
      )}
    </div>
  );
}
