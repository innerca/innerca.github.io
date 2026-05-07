import { useEffect, useRef } from 'react';
import { performance as perfConfig } from '../../config/performance';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

const COLORS = ['#00f0ff', '#b347ea', '#00d4ff', '#c084fc'];

function getParticleCount(): number {
  if (typeof window === 'undefined') return perfConfig.particleCount;
  return window.innerWidth < 768 ? perfConfig.particleCountMobile : perfConfig.particleCount;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    let animationId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function createParticle(): Particle {
      return {
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
      };
    }

    function init() {
      resize();
      const count = getParticleCount();
      for (let i = 0; i < count; i++) {
        particles.push(createParticle());
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;

        // Draw particle
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = COLORS[i % COLORS.length];
        ctx!.globalAlpha = p.alpha;
        ctx!.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < perfConfig.connectDist) {
            const alpha = (1 - dist / perfConfig.connectDist) * 0.12;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.strokeStyle = '#00f0ff';
            ctx!.globalAlpha = alpha;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      ctx!.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    }

    init();
    animate();

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.5 }}
      aria-hidden="true"
    />
  );
}
