import { useEffect } from 'react';

export default function AdBanner() {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (window.adsbygoogle) {
          window.adsbygoogle.push({});
        }
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }, 300); // delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: 'auto' }}
        data-ad-client="ca-pub-7613296594285114"
        data-ad-slot="9884779554"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
