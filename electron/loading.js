(function() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  const lightningOverlay = document.getElementById('lightning-overlay');
  const loadingImage = document.getElementById('loading-image');

  const isDev = !window.electronAPI || !window.electronAPI.resourcesPath;
  const imagePath = isDev 
    ? 'C:/Users/Nate/Downloads/1000001393.png'
    : window.electronAPI.resourcesPath + '/1000001393.png';

  loadingImage.src = imagePath;

  let width, height;
  let particles = [];
  let lightningTimeout;

  const purpleColors = ['#9b59b6', '#8e44ad', '#7d3c98', '#6c3483', '#bb8fce'];
  const orangeColors = ['#e67e22', '#d35400', '#f39c12', '#e59866', '#f8c471'];
  const whiteColors = ['#ffffff', '#e8daef', '#fadbd8'];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor(type) {
      this.reset(type);
    }

    reset(type) {
      this.type = type;
      this.x = Math.random() * width;
      this.y = type === 'purple' ? height + 20 : Math.random() * height;
      this.size = Math.random() * 4 + 2;
      
      if (type === 'purple') {
        this.color = purpleColors[Math.floor(Math.random() * purpleColors.length)];
        this.speedY = -(Math.random() * 1.5 + 0.5);
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.glow = 15;
      } else if (type === 'orange') {
        this.color = orangeColors[Math.floor(Math.random() * orangeColors.length)];
        this.speedY = -(Math.random() * 1 + 0.3);
        this.speedX = (Math.random() - 0.5) * 1;
        this.glow = 12;
      } else {
        this.color = whiteColors[Math.floor(Math.random() * whiteColors.length)];
        this.size = Math.random() * 3 + 1;
        this.speedY = -(Math.random() * 2 + 1);
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.glow = 20;
      }

      this.opacity = Math.random() * 0.5 + 0.5;
      this.decay = Math.random() * 0.003 + 0.001;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.opacity -= this.decay;

      if (this.y < -20 || this.x < -20 || this.x > width + 20 || this.opacity <= 0) {
        this.reset(this.type);
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.shadowBlur = this.glow;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function initParticles() {
    particles = [];
    const particleCount = 80;
    
    for (let i = 0; i < particleCount * 0.5; i++) {
      particles.push(new Particle('purple'));
    }
    for (let i = 0; i < particleCount * 0.35; i++) {
      particles.push(new Particle('orange'));
    }
    for (let i = 0; i < particleCount * 0.15; i++) {
      particles.push(new Particle('white'));
    }
  }

  function triggerLightning() {
    lightningOverlay.classList.add('flash');
    
    setTimeout(() => {
      lightningOverlay.classList.remove('flash');
    }, 100 + Math.random() * 150);

    if (Math.random() > 0.5) {
      setTimeout(() => {
        lightningOverlay.classList.add('flash');
        setTimeout(() => {
          lightningOverlay.classList.remove('flash');
        }, 50 + Math.random() * 100);
      }, 100 + Math.random() * 200);
    }

    const nextLightning = 2000 + Math.random() * 4000;
    lightningTimeout = setTimeout(triggerLightning, nextLightning);
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
    gradient.addColorStop(0, 'rgba(30, 10, 40, 0.3)');
    gradient.addColorStop(0.5, 'rgba(20, 10, 30, 0.2)');
    gradient.addColorStop(1, 'rgba(10, 5, 15, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    requestAnimationFrame(animate);
  }

  function init() {
    resize();
    initParticles();
    animate();
    
    setTimeout(triggerLightning, 1500);
  }

  window.addEventListener('resize', resize);

  window.onload = init;
})();
