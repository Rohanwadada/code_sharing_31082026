import {
  DM_Sans,
  DM_Serif_Display,
  Inter,
  JetBrains_Mono,
  Montserrat,
} from 'next/font/google';
import './globals.css';
import AuthInitializer from '@/components/auth/AuthInitializer';
import '@xyflow/react/dist/style.css';
import 'react-tooltip/dist/react-tooltip.css';
import 'katex/dist/katex.min.css';
import styles from './page.module.css';
import Notifier from '@/components/utility/Notifier';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
});

const dmSerifDisplay = DM_Serif_Display({
  variable: '--font-dm-serif-display',
  subsets: ['latin'],
  weight: '400',
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Shifu: Your personalized learning coach',
  description: 'Your personalized learning coach',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmSerifDisplay.variable} ${jetBrainsMono.variable} ${inter.variable} ${montserrat.variable}`}
      >
        <div className={styles['landing-background']}>
          <div className={styles['landing-content']}>
            <AuthInitializer />
            {children}
          </div>
        </div>
        <Notifier />
      </body>
    </html>
  );
}
