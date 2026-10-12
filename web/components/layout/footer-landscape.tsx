import styles from './footer-landscape.module.css';

/**
 * Decorative atmospheric wash under the footer (Parchment Frost): coral, sky-wash and mint radial blooms
 * on parchment, fading in from the page at its top edge. Pure CSS, static, hidden from assistive tech.
 */
export function FooterLandscape() {
  return <div aria-hidden="true" className={styles.landscape} />;
}
