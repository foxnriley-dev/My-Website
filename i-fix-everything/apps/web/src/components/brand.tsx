import { BRAND } from '@ife/domain';
import { Wrench } from 'lucide-react';
import Link from 'next/link';

export function BrandMark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-[9px] bg-accent text-on-accent">
        <Wrench className="size-4" aria-hidden />
      </span>
      <span>{BRAND.productName}</span>
    </Link>
  );
}
