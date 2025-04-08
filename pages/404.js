// pages/404.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Redirige automáticamente a la página principal
    router.replace('/');
  }, [router]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h2>Redireccionando...</h2>
    </div>
  );
}
