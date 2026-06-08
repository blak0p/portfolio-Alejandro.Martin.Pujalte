import React from 'react';

interface ContactButtonProps {
  href?: string;
}

export default function ContactButton({ href = 'mailto:martinpujaltea@gmail.com' }: ContactButtonProps) {
  return (
    <a
      href={href}
      data-contact-button
      className="block w-full bg-cobalt text-white text-center text-xs font-bold tracking-widest uppercase px-6 py-3 hover:bg-cobalt-light active:bg-cobalt-dark transition-colors duration-100 cursor-pointer"
    >
      INICIAR_CONTACTO →
    </a>
  );
}
