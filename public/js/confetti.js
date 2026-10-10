// Lightweight Pure Canvas Confetti Explosion (Zero External Dependencies)

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '9999';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ffffff'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.65,
      w: Math.random() * 9 + 5,
      h: Math.random() * 5 + 3,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.75) * 18,
      angle: Math.random() * 360,
      vAngle: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.35,
      opacity: 1
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.angle += p.vAngle;

      if (elapsed > 1500) {
        p.opacity -= 0.02;
      }

      if (p.opacity > 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (elapsed < 2800) {
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  render();
}
