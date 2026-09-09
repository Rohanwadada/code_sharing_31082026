import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import linkIcon from '@/assets/resource-link-icon.svg';
import styles from './NodeContentMarkdownRenderer.module.css';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Image from 'next/image';

const NodeContentMarkdownRenderer = ({ content }) => {
  const H2 = ({ node, ...props }) => (
    <h2 className={styles['md-h2']} {...props} />
  );

  const H3 = ({ node, ...props }) => (
    <h2 className={styles['md-h3']} {...props} />
  );

  const Table = ({ node, ...props }) => (
    <table className={styles['md-table']} {...props} />
  );
  const Th = ({ node, ...props }) => (
    <th className={styles['md-th']} {...props} />
  );
  const Td = ({ node, ...props }) => (
    <td className={styles['md-td']} {...props} />
  );
  const Tr = ({ node, ...props }) => (
    <tr className={styles['md-tr']} {...props} />
  );

  const Ul = ({ node, ...props }) => (
    <ul className={styles['md-ul']} {...props} />
  );
  const Ol = ({ node, ...props }) => (
    <ol className={styles['md-ol']} {...props} />
  );

  const Li = ({ node, ...props }) => (
    <li className={styles['md-li']} {...props} />
  );

  const P = ({ node, ...props }) => <p className={styles['md-p']} {...props} />;
  const A = ({ node, children, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className={styles['md-a']}
    >
      {children}
    </a>
  );

  const Pre = ({ node, ...props }) => (
    <pre className={styles['md-pre']} {...props} />
  );

  const Code = ({ node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = match || String(children).includes('\n');
    if (isBlock) {
      // Block code (```js ... ```) OR have a new line '\n' at end
      return (
        <SyntaxHighlighter
          style={dracula}
          language={match?.[1] || 'text'}
          PreTag="div"
          className={styles['code-syntax-highliter']}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }

    // Inline code (`like this`)
    return (
      <code className={styles['inline-code']} {...props}>
        {children}
      </code>
    );
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h2: H2,
        h3: H3,
        table: Table,
        th: Th,
        td: Td,
        tr: Tr,
        ul: Ul,
        ol: Ol,
        li: Li,
        a: A,
        p: P,
        code: Code,
        pre: Pre,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export const TypingMarkdown = ({ text, speed = 300 }) => {
  const [displayedWords, setDisplayedWords] = useState([]);

  useEffect(() => {
    const words = text.split(' ');
    let i = 0;

    const interval = setInterval(() => {
      setDisplayedWords((prev) => [...prev, words[i]]);
      i++;
      if (i >= words.length) {
        setDisplayedWords(words);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  /* useEffect(() => {
    // Split by spaces but keep heading markers with their first word
    const words = text.split(" ");
    const processedWords = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // If this word is a heading marker (##, ###, etc.) and there's a next word
      if (word.match(/^#{1,6}$/) && i + 1 < words.length) {
        // Combine the heading marker with the next word
        processedWords.push(word + " " + words[i + 1]);
        i++; // Skip the next word since we've already processed it
      } else {
        processedWords.push(word);
      }
    }

    console.log(processedWords);
    let i = 0;

    const interval = setInterval(() => {
      setDisplayedWords((prev) => [...prev, processedWords[i]]);
      i++;
      if (i >= processedWords.length) {
        setDisplayedWords(words);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]); */

  const displayedText = displayedWords.join(' ');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <NodeContentMarkdownRenderer content={displayedText} />
      {/* <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        |
      </motion.span> */}
    </motion.div>
  );
};

export default NodeContentMarkdownRenderer;
