import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import userAgent from 'user-agents';
import { generateUsername } from 'unique-username-generator';

puppeteer.use(StealthPlugin());

try {
  const browser = await puppeteer.connect({
    browserWSEndpoint:
      'ws://127.0.0.1:9222/devtools/browser/6b03e1f0-73b1-4450-80d7-1300b8faacd5',
    defaultViewport: null,
    args: ['--start-maximized'],
  });
  const page = await browser.newPage();

  await addChecks(page);

  // Navigate to Zillow.
  await page.goto('https://www.zillow.com/', {
    waitUntil: 'networkidle2',
    timeout: 0,
  });

  for (let i = 0; i < 20; i++) {
    console.log('iteration:', i + 1);
    await likeHouse(page);
  }
} catch (error) {
  console.error(error);
}

async function likeHouse(page) {
  // Open signup modal.
  let element = await page.waitForXPath('//ul//a');
  await element.click();
  //await page.click('.znav ul:last-child');
  element = await page.waitForSelector('#register-tab');
  await element.evaluate((e) => e.click());

  // Fill out signup form.
  const email = `${generateUsername('', 3)}@gmail.com`;
  const password = 'SuperTough123($)';
  await page.type('#inputs-newEmail', email);
  await page.type('#password', password);

  // Submit signup form.
  await sleep(500);
  await page.click('input[value="Submit"]');
  await page.waitForFunction(
    () => !document.querySelector('.act-auth-lightbox')
  );

  // Enter search bar input.
  await sleep(1000);
  await page.click('#search-box-input');
  await page.type('#search-box-input', '2812 Roscommon Drive');

  // Click on listing.
  await sleep(1000);
  element = await page.waitForXPath("//li[contains(., '2812 Roscommon Dr')]");
  await element.click();

  // Click on "Save" button.
  await sleep(2000);
  element = await page.waitForSelector('.ds-action-bar > nav > ul button');
  await element.click();

  // Sign out.
  await sleep(1000);
  element = await page.waitForSelector('ul.znav-links-authenticated img');
  await element.evaluate((e) => e.click());
  element = await page.waitForSelector(
    '#page-header-dropdown-popover > ul > ul:last-child a'
  );
  await element.click();

  await sleep(1000);
  //await browser.close();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function addChecks(page) {
  // await page.setUserAgent(userAgent.random().toString());
  // await page.setViewport({
  //   width: 1920 + Math.floor(Math.random() * 100),
  //   height: 1000 + Math.floor(Math.random() * 100),
  //   deviceScaleFactor: 1,
  //   hasTouch: false,
  //   isLandscape: false,
  //   isMobile: false,
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Pass webdriver check
  //   Object.defineProperty(navigator, 'webdriver', {
  //     get: () => false,
  //   });
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Pass chrome check
  //   window.chrome = {
  //     runtime: {},
  //     // etc.
  //   };
  // });

  // await page.evaluateOnNewDocument(() => {
  //   const originalQuery = window.navigator.permissions.query;
  //   return (window.navigator.permissions.query = (parameters) =>
  //     parameters.name === 'notifications'
  //       ? Promise.resolve({ state: Notification.permission })
  //       : originalQuery(parameters));
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Overwrite the `plugins` property to use a custom getter.
  //   Object.defineProperty(navigator, 'plugins', {
  //     get: () => [1, 2, 3, 4, 5],
  //   });
  // });

  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'languages', {
  //     get: () => ['en-US', 'en'],
  //   });
  // });

  await installMouseHelper(page);
}

async function bypassCaptcha(page) {
  try {
    const rect = await page.$eval('#px-captcha', (el) => {
      const { x, y } = el.getBoundingClientRect();
      return { x, y };
    });

    const offset = { x: 250, y: 25 };
    console.log('rect:', rect);

    await page.mouse.click(rect.x + offset.x, rect.y + offset.y, {
      delay: 11000,
    });
  } catch {}
}

async function installMouseHelper(page) {
  await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return;
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        const box = document.createElement('puppeteer-mouse-pointer');
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
        puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(0,0,0,.4);
          border: 1px solid white;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        puppeteer-mouse-pointer.button-1 {
          transition: none;
          background: rgba(0,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-2 {
          transition: none;
          border-color: rgba(0,0,255,0.9);
        }
        puppeteer-mouse-pointer.button-3 {
          transition: none;
          border-radius: 4px;
        }
        puppeteer-mouse-pointer.button-4 {
          transition: none;
          border-color: rgba(255,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-5 {
          transition: none;
          border-color: rgba(0,255,0,0.9);
        }
      `;
        document.head.appendChild(styleElement);
        document.body.appendChild(box);
        document.addEventListener(
          'mousemove',
          (event) => {
            box.style.left = event.pageX + 'px';
            box.style.top = event.pageY + 'px';
            updateButtons(event.buttons);
          },
          true
        );
        document.addEventListener(
          'mousedown',
          (event) => {
            updateButtons(event.buttons);
            box.classList.add('button-' + event.which);
          },
          true
        );
        document.addEventListener(
          'mouseup',
          (event) => {
            updateButtons(event.buttons);
            box.classList.remove('button-' + event.which);
          },
          true
        );
        function updateButtons(buttons) {
          for (let i = 0; i < 5; i++)
            box.classList.toggle('button-' + i, buttons & (1 << i));
        }
      },
      false
    );
  });
}
