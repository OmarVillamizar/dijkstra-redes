import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dijkstra Networks — Workspace de Grafos y Rutas',
  description:
    'Crea nodos y enlaces con peso en un tablero interactivo. Calcula la ruta óptima de menor coste con el algoritmo de Dijkstra y visualiza todas las rutas posibles.',
  keywords: ['dijkstra', 'grafos', 'redes', 'ruta óptima', 'algoritmo', 'visualizador'],
  authors: [{ name: 'Dijkstra Networks' }],
  openGraph: {
    title: 'Dijkstra Networks — Workspace de Grafos',
    description: 'Visualizador interactivo de grafos con algoritmo de Dijkstra.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
