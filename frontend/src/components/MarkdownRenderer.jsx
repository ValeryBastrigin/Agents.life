import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const MarkdownRenderer = ({ content, isStreaming }) => {
  if (!content) return null;

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none 
      prose-headings:text-gray-900 dark:prose-headings:text-white
      prose-p:text-gray-700 dark:prose-p:text-gray-300
      prose-strong:text-gray-900 dark:prose-strong:text-white
      prose-code:text-blue-600 dark:prose-code:text-blue-400
      prose-code:bg-gray-100 dark:prose-code:bg-gray-800
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800
      prose-pre:text-gray-100 prose-pre:border prose-pre:border-gray-700/50
      prose-a:text-blue-500 dark:prose-a:text-blue-400
      prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
      prose-ul:list-disc prose-ol:list-decimal
      prose-li:text-gray-700 dark:prose-li:text-gray-300
      prose-hr:border-gray-200 dark:prose-hr:border-gray-700
      leading-relaxed`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting style
          code({ node, inline, className, children, ...props }) {
            if (inline) {
              return (
                <code className="text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <pre className="overflow-x-auto">
                  <code className={`text-sm ${className}`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Better link handling
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-blue-500/30 hover:decoration-blue-500 transition-colors"
              >
                {children}
              </a>
            );
          },
          // Image handling — исправляем относительные /uploads/ URL
          img({ src, alt }) {
            // Если src начинается с /uploads/ — добавляем base URL бэкенда
            const resolvedSrc = src && src.startsWith('/uploads/')
              ? `${API_URL}${src}`
              : src;
            return (
              <img
                src={resolvedSrc}
                alt={alt}
                className="max-w-full rounded-lg shadow-md my-2"
                loading="lazy"
              />
            );
          },
          // Add IDs to headings for potential anchor links
          h1({ children, ...props }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-');
            return <h1 id={id} className="text-xl font-bold mt-6 mb-3" {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-');
            return <h2 id={id} className="text-lg font-bold mt-5 mb-2" {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-');
            return <h3 id={id} className="text-base font-semibold mt-4 mb-2" {...props}>{children}</h3>;
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-left text-sm font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm">
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;