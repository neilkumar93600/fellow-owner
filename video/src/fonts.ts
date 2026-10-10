import {loadFont} from '@remotion/google-fonts/Inter';

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600'], subsets: ['latin']});

export const FONT = `${fontFamily}, 'Helvetica Neue', Arial, system-ui, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
