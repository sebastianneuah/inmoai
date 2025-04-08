// pages/[[...slug]].js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CatchAll() {
  const router = useRouter();

  useEffect(() => {
    // Redirige automáticamente a la raíz
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
      <h2>Redireccionando a inicio...</h2>
    </div>
  );
}
