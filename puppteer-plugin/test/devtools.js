function injectScript() {
  const script = document.createElement('script');
  script.textContent = `
    console.log('✅ Hello from injected script in MAIN WORLD!');
    console.log('Current URL:', window.location.href);
    // 你可以访问页面的全局变量，例如：
    // if (typeof React !== 'undefined') console.log('React detected!');
  `;
  
  // 插入到页面中并立即执行
  (document.head || document.documentElement).appendChild(script);
  
  // 可选：执行后移除 script 标签（不影响已执行的代码）
  script.remove();
}

// 确保 DOM 已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}