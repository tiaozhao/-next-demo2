'use client'
export default function Home() {

  const handleClick = () => {
    const appLink = 'https://next-demo-rose-seven.vercel.app/buy';

    // Fallback URL 指向 App Store
    const fallbackURL = 'https://itunes.apple.com/us/app/guitar-center-shop-new-used/id1173029601';
  
    // 创建定时器，如果 App 没有打开，在 2 秒后跳转到 App Store
    const timeout = setTimeout(() => {
      window.location.href = fallbackURL;
    }, 500);
  
    // 尝试通过 Universal Link 打开 App
    window.location.href = appLink;
  
    // 监听页面可见性，如果用户返回了页面，则清除定时器
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timeout);
      }
    });
  }


  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
        <a className="mb-4" href={`https://next-demo-rose-seven.vercel.app/buy?_timestamp=${new Date().getTime()}`}>Open in a App</a>

          <li className="mb-2" onClick={handleClick}>
            this is a test
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>
      </main>
    </div>
  );
}
