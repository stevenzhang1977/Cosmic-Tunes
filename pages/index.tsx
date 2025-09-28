// pages/index.tsx
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Cosmic Tunes</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          background-color: #0B0F14; /* Original Deep space background */
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}</style>
      <main style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        // Slight hint of deep cosmic purple, less dominant
        backgroundColor: '#0F0B1C',
      }}>
        {/* Starfield Layer 1: Smaller, more numerous, distinct colors */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '200%', // Allows for vertical movement
          backgroundImage: `
            radial-gradient(circle at 10% 80%, #FFFFFF 0.8px, transparent 1.2px), /* Bright White */
            radial-gradient(circle at 80% 20%, #A9EFFF 0.8px, transparent 1.2px), /* Soft Cyan */
            radial-gradient(circle at 30% 50%, #FFD1DC 0.8px, transparent 1.2px), /* Light Pink */
            radial-gradient(circle at 55% 10%, #E6E6FA 0.8px, transparent 1.2px), /* Lavender */
            radial-gradient(circle at 20% 90%, #98FB98 0.8px, transparent 1.2px), /* Pale Green */
            radial-gradient(circle at 70% 40%, #DDA0DD 0.8px, transparent 1.2px)  /* Plum */
          `,
          backgroundSize: '60px 60px, 70px 70px, 50px 50px, 80px 80px, 90px 90px, 45px 45px',
          opacity: 0.25, // Increased opacity for better visibility
          animation: 'starfieldSmall 160s linear infinite', // Adjust duration for slower movement
        }}></div>

        {/* Starfield Layer 2: Larger, fewer, more subtle colors, reversed animation for parallax */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '200%', // Allows for vertical movement
          backgroundImage: `
            radial-gradient(circle at 25% 65%, #ADD8E6 1.2px, transparent 2px), /* Light Blue */
            radial-gradient(circle at 90% 15%, #BA55D3 1.2px, transparent 2px), /* Medium Orchid */
            radial-gradient(circle at 45% 85%, #FFEFD5 1.2px, transparent 2px), /* PapayaWhip - subtle warm */
            radial-gradient(circle at 60% 35%, #9370DB 1.2px, transparent 2px)  /* Medium Purple */
          `,
          backgroundSize: '120px 120px, 180px 180px, 140px 140px, 100px 100px',
          opacity: 0.15, // Slightly lower opacity for larger, further stars
          animation: 'starfieldLarge 240s linear infinite reverse', // Even slower, reversed
        }}></div>

        <div style={{
          padding: 40,
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
          zIndex: 1, // Ensure the content is on top of the starfield
          textAlign: 'center',
          maxWidth: '500px',
        }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 48,
            fontWeight: 700,
            marginBottom: 16,
            background: 'linear-gradient(90deg, #fff, #63d4f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            position: 'relative',
          }}>
            Cosmic Tunes
            {/* Soft bloom effect */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle, #63d4f1 0%, transparent 70%)',
              opacity: 0.3,
              zIndex: -1,
            }}></div>
          </h1>
          <p style={{
            fontSize: 16,
            opacity: .8,
            marginBottom: 32,
            lineHeight: 1.5
          }}>
            Turn your listening history into a galaxy. Explore a visual representation of your top artists and compare them with others in a celestial starscape.
          </p>

          <button
            onClick={() => { window.location.href = "/api/login"; }}
            style={{
              padding: '12px 24px',
              background: '#6366f1',
              borderRadius: 50,
              fontWeight: 700,
              fontSize: 16,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.3s ease, transform 0.2s ease',
              textDecoration: 'none',
              display: 'inline-block',
              position: 'relative',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)',
            }}
          >
            Connect Spotify ✦
          </button>
        </div>
      </main>
      <style jsx>{`
        @keyframes starfieldSmall {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-50%);
          }
        }
        @keyframes starfieldLarge {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-50%);
          }
        }
      `}</style>
    </>
  );
}
