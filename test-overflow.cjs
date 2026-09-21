const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://localhost:3000');
  const culprit = await page.evaluate(() => {
    let max = 0;
    let className = '';
    let tagName = '';
    document.querySelectorAll('*').forEach(el => {
      const w = el.getBoundingClientRect().width;
      if (w > max && w > 375) {
        max = w;
        className = el.className;
        tagName = el.tagName;
      }
    });
    return { max, className, tagName };
  });
  console.log(culprit);
  await browser.close();
})();
