/**
 * @file Footer.tsx
 * @description Pied de page d'EasyStudio affichant le copyright, la version de l'application
 * et des liens externes (GitHub, Portfolio, LinkedIn, Vidéo, Contact, CV).
 * @module components/Footer/Footer
 */

import './Footer.css';

const IconGitHub = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53
    5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49
    -2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
    -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72
    1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
    -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2
    -.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32
    -.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82
    2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82
    2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54
    1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013
    8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

const IconPortfolio = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8.354 1.146a.5.5 0 00-.708 0l-6 6A.5.5 0
    001 7.5V14a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-3h4v3a.5.5
    0 00.5.5h4a.5.5 0 00.5-.5V7.5a.5.5 0 00-.146-.354L13
    5.793V2.5a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5v1.293L8.354
    1.146z"/>
  </svg>
);

const IconLinkedIn = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474
    0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175
    1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943
    12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0
    1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342
    -1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248
    1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432
    .08-.586.173-.431.568-.878 1.232-.878.869 0 1.216
    .662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252
    -2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016
    a5.54 5.54 0 01.016-.025V6.169h-2.4c.03.678 0 7.225
    0 7.225h2.4z"/>
  </svg>
);

const IconVideo = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0
    108 0a8 8 0 000 16z"/>
    <path d="M6.271 5.055a.5.5 0 01.52.038l3.5 2.5a.5.5
    0 010 .814l-3.5 2.5A.5.5 0 016 10.5v-5a.5.5 0
    01.271-.445z"/>
  </svg>
);

const IconEmail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M0 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0
    01-2 2H2a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v.217l7
    4.2 7-4.2V4a1 1 0 00-1-1H2zm13 2.383l-4.758 2.855L15
    11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728
    8.82l-5.694 3.44A1 1 0 002 13h12a1 1 0
    00.966-.739z"/>
  </svg>
);

const IconCV = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M.5 9.9a.5.5 0 01.5.5v2.5a1 1 0 001 1h12a1
    1 0 001-1v-2.5a.5.5 0 011 0v2.5a2 2 0 01-2 2H2a2 2
    0 01-2-2v-2.5a.5.5 0 01.5-.5z"/>
    <path d="M7.646 11.854a.5.5 0 00.708 0l3-3a.5.5 0
    00-.708-.708L8.5 10.293V1.5a.5.5 0 00-1 0v8.793L5.354
    8.146a.5.5 0 10-.708.708l3 3z"/>
  </svg>
);

/**
 * @interface FooterLink
 * @description Structure d'un lien de navigation dans le pied de page.
 */
interface FooterLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  download?: string;
  hoverClass?: string;
}

const LINKS: FooterLink[] = [
  {
    href: 'https://github.com/Spiritzen',
    label: 'GitHub',
    icon: <IconGitHub />,
  },
  {
    href: 'https://spiritzen.github.io/portfolio/',
    label: 'Portfolio',
    icon: <IconPortfolio />,
  },
  {
    href: 'https://www.linkedin.com/in/sebastien-cantrelle-26b695106/',
    label: 'LinkedIn',
    icon: <IconLinkedIn />,
  },
  {
    href: 'https://www.youtube.com/watch?v=DVOQzauF8Es',
    label: 'Vidéo',
    icon: <IconVideo />,
    hoverClass: 'footer-link--youtube',
  },
  {
    href: 'mailto:sebastien.cantrelle@hotmail.fr',
    label: 'Contact',
    icon: <IconEmail />,
  },
  {
    href: '/EasyStudio/cv/CV_Sebastien_Cantrelle.pdf',
    label: 'CV',
    icon: <IconCV />,
    download: 'CV_Sebastien_Cantrelle.pdf',
    hoverClass: 'footer-link--cv',
  },
];

/**
 * @component Footer
 * @description Pied de page avec copyright à gauche, version au centre
 * et liens externes à droite (GitHub, Portfolio, LinkedIn, Vidéo, Contact, CV).
 * @returns JSX du composant Footer.
 */
export default function Footer() {
  return (
    <footer className="app-footer">
      {/* ── Left: copyright ── */}
      <div className="footer-left">
        <span>© {new Date().getFullYear()} EasyStudio — créé par Sébastien Cantrelle</span>
      </div>

      {/* ── Center: version ── */}
      <div className="footer-center">
        <span>v1.2.1 · Open Source · MIT License</span>
      </div>

      {/* ── Right: links ── */}
      <nav className="footer-right" aria-label="Liens externes">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={`footer-link ${link.hoverClass ?? ''}`}
            target="_blank"
            rel="noopener noreferrer"
            {...(link.download ? { download: link.download } : {})}
            title={link.label}
          >
            {link.icon}
            <span className="footer-link-text">{link.label}</span>
          </a>
        ))}
      </nav>
    </footer>
  );
}
