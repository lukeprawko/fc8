/**
 * @file watermark.ts
 * @description Ochrona autorstwa: cyfrowe znaki wodne i weryfikacja integralności klienta
 */

export const COPYRIGHT_SIGNATURE = 'CF28-ORIGIN-SEC-SIG-2026-X779';
export const COPYRIGHT_NOTICE = 'Copyright (c) 2026 Nova Games / CyberFC 28. All Rights Reserved.';

/**
 * Wstrzykuje niewidoczny i widoczny znak wodny do struktury dokumentu DOM
 */
export function injectDomWatermark(): void {
  // 1. Znak wodny w komentarzu DOM
  const comment = document.createComment(` LEGAL NOTICE: ${COPYRIGHT_NOTICE} [ID: ${COPYRIGHT_SIGNATURE}] `);
  document.documentElement.appendChild(comment);

  // 2. Niewidoczny znacznik weryfikacyjny z sumą kontrolną
  const sigElement = document.createElement('div');
  sigElement.id = 'fc28-origin-signature';
  sigElement.setAttribute('aria-hidden', 'true');
  sigElement.setAttribute('data-origin-sig', COPYRIGHT_SIGNATURE);
  sigElement.style.cssText = 'position:fixed;bottom:2px;right:6px;font-size:9px;color:rgba(255,255,255,0.18);pointer-events:none;z-index:999999;font-family:monospace;letter-spacing:1px;';
  sigElement.textContent = `CF28 • ${COPYRIGHT_SIGNATURE}`;
  document.body.appendChild(sigElement);

  // 3. Sprawdzenie integralności domeny (Anti-Site-Cloning)
  const currentHost = window.location.hostname;
  const isAllowedHost =
    currentHost === 'localhost' ||
    currentHost === '127.0.0.1' ||
    currentHost === 'novagames.pl' ||
    currentHost.endsWith('.pages.dev');

  if (!isAllowedHost) {
    console.warn('[SECURITY] Nieautoryzowana domena lustrzana. Wykryto próbę kradzieży gry.');
  }
}

/**
 * Rysuje subtelny znak wodny bezpośrednio w buforze klatki płótna
 */
export function drawCanvasWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.textAlign = 'right';
  ctx.fillText(`NOVA GAMES • ${COPYRIGHT_SIGNATURE}`, width - 15, height - 12);
  ctx.restore();
}
