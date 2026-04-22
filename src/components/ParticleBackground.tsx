import { useEffect, useRef } from 'react';
import type { Pillar } from '../hooks/useProgression';
import { useProgression } from '../hooks/useProgression';

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useProgression();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: Particle[] = [];
    const particleCount = Math.floor((width * height) / 15000);

    let mouse = { x: -1000, y: -1000 };

    // Determine highest pillar color
    const levels = state.level;
    let maxLevel = -1;
    let bestPillar: Pillar = 'Study';
    for (const p of ['Study', 'Health', 'Finance', 'Mind'] as Pillar[]) {
      if (levels[p] > maxLevel) {
        maxLevel = levels[p];
        bestPillar = p;
      }
    }

    let colorRGB = '148, 163, 184'; // default slate-400
    if (maxLevel > 1) { // Only color if leveled up
      if (bestPillar === 'Study') colorRGB = '59, 130, 246'; // blue-500
      if (bestPillar === 'Health') colorRGB = '16, 185, 129'; // emerald-500
      if (bestPillar === 'Finance') colorRGB = '245, 158, 11'; // amber-500
      if (bestPillar === 'Mind') colorRGB = '168, 85, 247'; // purple-500
    }

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseX: number;
      baseY: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction (repel)
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        if (distance < maxDist) {
          const force = (maxDist - distance) / maxDist;
          this.x -= (dx / distance) * force * 4;
          this.y -= (dy / distance) * force * 4;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(${colorRGB}, 0.6)`; // dynamic
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        // Draw connecting lines
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colorRGB}, ${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        
        // Draw lines to mouse
        if (mouse.x > -1000 && mouse.y > -1000) {
          const mdx = particles[i].x - mouse.x;
          const mdy = particles[i].y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          
          if (mdist < 250) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colorRGB}, ${0.6 * (1 - mdist / 250)})`;
            ctx.lineWidth = 1.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[-1]"
    />
  );
}
