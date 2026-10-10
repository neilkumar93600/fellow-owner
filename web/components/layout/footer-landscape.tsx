import styles from './footer-landscape.module.css';

/**
 * Decorative golden-hour landscape under the footer: a generated image (see prompt.md, "footer-landscape")
 * that fades in from the cream page at its top edge. Static, hidden from assistive tech, no text in it.
 */
export function FooterLandscape() {
  return (
    <div aria-hidden="true" className={styles.landscape}>
      <picture>
        <source media="(min-width: 768px)" srcSet="/creator/footer-landscape.webp" />
        <img
          src="/creator/footer-landscape-mobile.webp"
          alt=""
          width={1200}
          height={702}
          loading="lazy"
          decoding="async"
          className={styles.art}
        />
      </picture>
    </div>
  );
}
