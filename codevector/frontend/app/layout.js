export const metadata = {
  title: 'Product Browser - CodeVector Task',
  description: 'Browse 200,000 products, newest first, with stable cursor pagination',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f7f9' }}>
        {children}
      </body>
    </html>
  );
}
