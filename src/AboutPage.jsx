// src/pages/AboutPage.jsx
import React from 'react'
import AdUnit from './components/common/AdUnit'

const AboutPage = () => {
  const features = [
    {
      icon: '✉️',
      title: 'Rich HTML Email Builder',
      description: 'Compose beautiful, professionally formatted emails with our intuitive HTML editor. Add images, links, and custom styling easily.',
      color: 'blue'
    },
    {
      icon: '📨',
      title: 'Multi-Recipient Sending',
      description: 'Send to multiple recipients at once with confidence. Support for To, CC, and BCC fields with recipient validation.',
      color: 'green'
    },
    {
      icon: '🏷️',
      title: 'Personalization with Merge Tags',
      description: 'Use placeholders like [FirstName], [Email], and [Date] to create personalized emails. Dynamic content rendering per recipient.',
      color: 'purple'
    },
    {
      icon: '🔧',
      title: 'Multiple Email Providers',
      description: 'Choose your preferred sending service. Support for SMTP, AWS SES, and Resend with flexible configuration.',
      color: 'orange'
    },
    {
      icon: '📊',
      title: 'Email Tracking & Logging',
      description: 'Track all sent emails with delivery status. Comprehensive logs help you audit and troubleshoot any issues.',
      color: 'red'
    },
    {
      icon: '📎',
      title: 'File Attachments',
      description: 'Attach files to your emails seamlessly. Support for multiple file types to complement your message.',
      color: 'cyan'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100',
    cyan: 'bg-cyan-100'
  };

  const benefits = [
    'Reliable email delivery for your business',
    'Professional HTML email composition',
    'Personalized messaging at scale',
    'Multiple sending provider options',
    'Complete email tracking and logging',
    'User-friendly interface'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              ✨ Professional Email Platform
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
            InboxGuaranteed
          </h1>
          <p className="text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Reliable email delivery for your business
          </p>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
            A professional email sending platform designed to help businesses reliably deliver messages to their customers with confidence and efficiency.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        
        {/* Mission Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-gray-900">Our Mission</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                InboxGuaranteed makes professional email delivery simple and reliable. We empower businesses to create beautiful HTML emails, personalize messages with merge tags, and send with confidence.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Our mission is to provide a reliable, secure, and user-friendly email platform that eliminates delivery uncertainties and gives businesses peace of mind that their communications reach intended recipients.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold text-sm">✓ Reliable Delivery</span>
                <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold text-sm">✓ Easy to Use</span>
                <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg font-semibold text-sm">✓ Secure & Fast</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">✉️</div>
                  <p className="text-gray-600 font-semibold text-lg">Send professional emails with ease</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold mb-12 text-gray-900 text-center">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-8 border border-gray-100">
                <div className={`w-14 h-14 ${colorClasses[feature.color]} rounded-lg flex items-center justify-center mb-4`}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-12 text-white">
            <h2 className="text-4xl font-bold mb-8 text-center">Why Choose InboxGuaranteed?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold">✓</span>
                  </div>
                  <span className="text-lg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <h2 className="text-4xl font-bold mb-6 text-gray-900">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join businesses that trust InboxGuaranteed for their email sending needs. Start sending professional emails today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/login" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Login
            </a>
            <a href="/register" className="px-8 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
              Sign Up
            </a>
          </div>
        </section>
      </div>

      {/* Ad Unit */}
      <div className="mt-16 border-t border-gray-200 pt-8">
        <div className="max-w-6xl mx-auto px-4">
          <AdUnit />
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
