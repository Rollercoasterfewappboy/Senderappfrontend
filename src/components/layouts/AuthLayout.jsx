import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiX,
  FiSend,
  FiCheck,
  FiBarChart2,
  FiLock
} from 'react-icons/fi'

export default function AuthLayout({ children }) {
  const [loading, setLoading] = useState(true)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showFeaturesModal, setShowFeaturesModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false)


  useEffect(() => {
    // Load initial data
    setLoading(false)
  }, [])

  const Modal = ({ title, content, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-lg shadow-lg overflow-y-auto max-h-[90vh] relative p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <FiX className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100">
      {/* Header - logo only for landing pages */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-lg flex items-center justify-center mr-3">
                  <FiMail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">InboxGuaranteed</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* New Landing Layout - modern, minimal, no footer on landing pages */}
      <main className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row items-stretch">
        <section className="lg:flex-1 relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">InboxGuaranteed</h2>
              <p className="mt-4 text-base sm:text-lg text-gray-300 max-w-2xl">Reliable, high-performance, and secure email and SMS delivery built for teams and businesses. Create rich, responsive HTML emails, personalize messages at scale, and seamlessly integrate with your preferred delivery provider for maximum flexibility and control.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/10 p-5 rounded-xl">
                <h4 className="font-semibold">Rich HTML Composer</h4>
                <p className="text-sm text-gray-300 mt-2">WYSIWYG editor and templates for beautiful emails.</p>
              </div>
               <div className="bg-white/10 p-5 rounded-xl">
                <h4 className="font-semibold">Sms Sender</h4>
                <p className="text-sm text-gray-300 mt-2">Support multiple SMS providers to ensure reliable message delivery.</p>
              </div>
              <div className="bg-white/10 p-5 rounded-xl">
                <h4 className="font-semibold">Email Sender - Reliable Delivery</h4>
                <p className="text-sm text-gray-300 mt-2">Multiple providers (SMTP, AWS SES, Resend) for higher deliverability.</p>
              </div>
              <div className="bg-white/10 p-5 rounded-xl">
                <h4 className="font-semibold">Personalization</h4>
                <p className="text-sm text-gray-300 mt-2">Merge tags and per-recipient variables for tailored messaging.</p>
              </div>
              <div className="bg-white/10 p-5 rounded-xl">
                <h4 className="font-semibold">Analytics</h4>
                <p className="text-sm text-gray-300 mt-2">Delivery logs and status for auditing and troubleshooting.</p>
              </div>
            </div>
          </div>

          {/* Decorative SVG */}
          <svg className="hidden md:block absolute right-0 bottom-0 opacity-40 w-1/2 max-w-xs md:max-w-md lg:max-w-lg" viewBox="0 0 600 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.06" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="600" height="200" rx="20" fill="url(#g)" />
          </svg>
        </section>

        <section className="w-full sm:w-2/3 lg:w-1/3 bg-white flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">
            <div className="hidden lg:block text-center mb-6">
              <h3 className="text-2xl font-bold">Get started with InboxGuaranteed</h3>
              <p className="text-sm text-gray-500">Sign in to your account or register to start sending.</p>
            </div>
            {children}
          </div>
        </section>
      </main>

{/* MODALS */}
{showAboutModal && (
  <Modal
    title="About InboxGuaranteed"
    onClose={() => setShowAboutModal(false)}
    content={`ABOUT INBOXGUARANTEED

InboxGuaranteed is a professional email delivery platform that empowers businesses to send reliable, beautifully formatted emails with confidence and ease. We provide a comprehensive solution for composing, personalizing, and tracking emails at scale.

OUR MISSION

We believe every business deserves professional email communication tools. InboxGuaranteed eliminates delivery uncertainties by providing a user-friendly platform with multiple sending options, ensuring your messages reach intended recipients reliably.

KEY CAPABILITIES

✉️ HTML Email Composition
Create rich, professionally formatted emails with intuitive editing tools. Add images, links, and custom styling without technical expertise.

📨 Multi-Recipient Delivery  
Send to multiple recipients simultaneously with To, CC, and BCC support. Recipient validation ensures accurate delivery.

🏷️ Personalization Magic
Use merge tags like [FirstName], [Email], [Date] to create personalized messages. Dynamic content renders uniquely for each recipient.

🔧 Multiple Email Providers
Choose your preferred sending service: SMTP, AWS SES, or Resend. Flexible configuration for your specific needs.

📊 Email Tracking & Logging
Track all sent emails with delivery status. Comprehensive logs for auditing and troubleshooting.

📎 File Attachments
Attach files to your emails seamlessly. Support for multiple file types.

WHY CHOOSE INBOXGUARANTEED?

✓ Reliable Delivery - Multiple provider options ensure your emails get delivered
✓ Professional Design - Create beautiful HTML emails without coding
✓ Personalization - Dynamic content for each recipient
✓ Complete Tracking - Know the status of every sent email
✓ User-Friendly - Intuitive interface for all skill levels
✓ Secure & Scalable - Enterprise-grade security with growth-ready features

Trusted by thousands of businesses worldwide for professional email communication.`}
  />
)}

{showFeaturesModal && (
  <Modal
    title="Features"
    onClose={() => setShowFeaturesModal(false)}
    content={`INBOXGUARANTEED - COMPREHENSIVE EMAIL FEATURES

✉️ RICH HTML EMAIL BUILDER
• Compose professionally formatted emails with WYSIWYG editor
• Add images, links, buttons, and custom styling
• Pre-built templates for common scenarios
• Real-time HTML preview
• Responsive design for all devices

📨 MULTI-RECIPIENT SENDING
• Send to multiple recipients in one action
• To, CC, and BCC field support
• Automatic recipient validation
• Delivery status confirmation
• Detailed email logs
• Resend capability

🏷️ PERSONALIZATION & MERGE TAGS
• Support for [FirstName], [LastName], [Email], [Date]
• Dynamic content customization
• Per-recipient variable substitution
• Conditional content rendering
• Advanced merge tag options

🔧 MULTIPLE EMAIL PROVIDER INTEGRATION
• SMTP server support with full configuration
• AWS SES seamless integration
• Resend provider support
• Flexible provider switching
• Secure credential management

📊 EMAIL TRACKING & ANALYTICS
• Real-time delivery status
• Comprehensive email logging
• Send/delivery timestamps
• Provider response details
• Audit trail for compliance

📎 FILE ATTACHMENTS
• Attach files directly to emails
• Support for multiple file types
• File size management
• Attachment verification

🔐 SECURITY & COMPLIANCE
• Enterprise-grade encryption
• Secure credential storage
• SSL/TLS support
• Data protection compliance
• GDPR-ready features

⚙️ ADMIN DASHBOARD
• User management and access control
• System configuration settings
• Email provider management
• Usage analytics and reporting
• Activity logging

WHO CAN BENEFIT?

📧 Marketers & Sales Teams - Send campaigns with personalization
🏢 Businesses & Organizations - Professional communication
👥 Teams & Departments - Collaborative email management
🤖 Automation Workflows - Scheduled email sending
💼 Enterprises - Large-scale reliable email delivery`}
  />
)}

{showContactModal && (
  <Modal
    title="Contact Us"
    onClose={() => setShowContactModal(false)}
    content={`CONTACT INBOXGUARANTEED

We'd love to hear from you! Whether you have questions, need technical support, or want to share feedback, our team is here to help.

HOW TO REACH US

Customer Support
For assistance with your account, email sending, or technical issues, please reach out to us:

📧 Email: support@inboxguaranteed.com

We aim to respond to all inquiries within 24–48 hours.

SUPPORT AREAS

✓ Account & Authentication Issues
✓ Email Delivery Troubleshooting
✓ Provider Configuration Help
✓ Feature Explanations
✓ Technical Guidance
✓ Feedback & Suggestions

WHAT TO INCLUDE IN YOUR MESSAGE

• Your account email address
• Clear description of your issue
• Steps you've already tried (if applicable)
• Screenshots or error messages (if relevant)

Thank you for choosing InboxGuaranteed for your professional email delivery needs!`}

  />
)}

{showPrivacyPolicyModal && (
  <Modal
    title="Privacy Policy"
    onClose={() => setShowPrivacyPolicyModal(false)}
    content={`PRIVACY POLICY - INBOXGUARANTEED

At InboxGuaranteed, protecting your personal information and your right to privacy is our commitment. When you use our platform, we may collect necessary data to deliver and improve our services.

DATA COLLECTION & USAGE

We collect information to provide email delivery services:
• Account credentials and profile information
• Email content and recipient data
• Delivery logs and usage statistics
• Technical information (IP address, browser type)

YOUR DATA IS PROTECTED BY

✓ Never sold to third parties
✓ Encrypted with industry-standard SSL/TLS
✓ Secure database storage with access controls
✓ Used only to provide and enhance your service
✓ Stored securely on protected servers

YOUR RIGHTS

You have the right to:
• Access your personal information
• Update or correct inaccurate data
• Delete your account and data
• Export your information
• Request data in standard formats
• Opt-out of non-essential communications

DATA RETENTION

• Account data: While your account is active
• Email logs: Retained for delivery tracking
• Backup copies: Maintained for recovery purposes
• We comply with data retention regulations

SECURITY MEASURES

• SSL/TLS encryption for data in transit
• Secure authentication protocols
• Regular security audits
• Access restrictions to sensitive data
• Incident response procedures

THIRD PARTIES

Email provider integrations (SMTP, AWS SES, Resend) may process your data according to their privacy policies. We ensure they maintain appropriate security standards.

COMPLIANCE

Our platform complies with:
✓ GDPR requirements
✓ Data protection regulations
✓ Privacy standards and best practices

CONTACT US

For privacy concerns or inquiries:
📧 support@inboxguaranteed.com

Last Updated: 2024`}

  />
)}
    </div>
  )
}











// import { useState, useEffect } from 'react'
// import { Link } from 'react-router-dom'
// import axios from 'axios'
// import { FiChevronLeft, FiChevronRight, FiShield, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

// export default function AuthLayout({ children }) {
//   const [advertisements, setAdvertisements] = useState([])
//   const [currentAdIndex, setCurrentAdIndex] = useState(0)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     fetchAdvertisements()
//   }, [])

//   useEffect(() => {
//     if (advertisements.length > 1) {
//       const interval = setInterval(() => {
//         setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
//       }, 5000)
//       return () => clearInterval(interval)
//     }
//   }, [advertisements.length])

//   const fetchAdvertisements = async () => {
//     try {
//       const response = await axios.get('/advertisements/active')
//       setAdvertisements(response.data.advertisements || [])
//     } catch (error) {
//       console.error('Error fetching advertisements:', error)
//       setAdvertisements([])
//     } finally {
//       setLoading(false)
//     }
//   }

//   const nextAd = () => {
//     setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
//   }

//   const prevAd = () => {
//     setCurrentAdIndex((prev) => (prev - 1 + advertisements.length) % advertisements.length)
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100">
//       {/* Professional Header */}
//       <header className="bg-white shadow-sm border-b border-gray-200">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between h-16">
//             <div className="flex items-center">
//               <div className="flex-shrink-0 flex items-center">
//                 <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mr-3">
//                   <FiShield className="w-6 h-6 text-white" />
//                 </div>
//                 <div>
//                   <h1 className="text-xl font-bold text-gray-900">
//                     Marketbook<span className="text-primary-600">&solution</span>
//                   </h1>
//                   <p className="text-xs text-gray-500">Professional Marketplace</p>
//                 </div>
//               </div>
//             </div>
//             <nav className="hidden md:flex items-center space-x-8">
//               <a href="#features" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">Features</a>
//               <a href="#about" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">About</a>
//               <a href="#contact" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">Contact</a>
//               <Link to="/global-admin-login" className="text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors">Admin Portal</Link>
//             </nav>
//             <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
//               <div className="flex items-center">
//                 <FiMail className="w-4 h-4 mr-1" />
//                 <span>support@marketbooksolution.com</span>
//               </div>
//               <div className="flex items-center">
//                 <FiPhone className="w-4 h-4 mr-1" />
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="flex min-h-[calc(100vh-64px)]">
//         {/* Left Side */}
//         <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-gradient-to-br from-primary-600 to-primary-800">
//           <div className="max-w-md text-center text-white">
//             <div className="mb-8">
//               <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
//                 <FiShield className="w-10 h-10 text-white" />
//               </div>
//               <h1 className="text-4xl font-bold mb-4">
//                 Welcome to Marketbook<span className="text-primary-200">&solution</span>
//               </h1>
//               <p className="text-xl text-primary-100 mb-8">
//                 The complete professional marketplace management system
//               </p>
//             </div>
//             <div className="space-y-6 text-left">
//               {/* Feature Items */}
//               <div className="flex items-start space-x-4">
//                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-1">
//                   <div className="w-2 h-2 bg-white rounded-full"></div>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-white mb-1">Professional Invoice Generation</h3>
//                   <p className="text-primary-100 text-sm">Create, send, and track professional invoices with ease</p>
//                 </div>
//               </div>
//               <div className="flex items-start space-x-4">
//                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-1">
//                   <div className="w-2 h-2 bg-white rounded-full"></div>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-white mb-1">Advanced Admin Controls</h3>
//                   <p className="text-primary-100 text-sm">Comprehensive management tools for power users</p>
//                 </div>
//               </div>
//               <div className="flex items-start space-x-4">
//                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-1">
//                   <div className="w-2 h-2 bg-white rounded-full"></div>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-white mb-1">Real-time Notifications & Escrow Support</h3>
//                   <p className="text-primary-100 text-sm">Stay updated with instant alerts and ensure secure transactions through built-in escrow features.</p>
//                 </div>
//               </div>
//               <div className="flex items-start space-x-4">
//                 <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-1">
//                   <div className="w-2 h-2 bg-white rounded-full"></div>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold text-white mb-1">24/7 Support System & Professional Services</h3>
//                   <p className="text-primary-100 text-sm">Get help when you need it with our dedicated support, and we also offer custom website development, product designs, and logo creation to elevate your business.</p>
//                 </div>
//               </div>
//             </div>
//             <div className="mt-8 pt-8 border-t border-white/20">
//               <p className="text-primary-100 text-sm">Trusted by thousands of businesses worldwide</p>
//             </div>
//           </div>
//         </div>

//         {/* Right Side */}
//         <div className="w-full lg:w-1/2 flex flex-col">
//           {!loading && advertisements.length > 0 && (
//             <div className="bg-white shadow-sm border-b border-gray-200">
//               <div className="relative h-32 md:h-40 overflow-hidden">
//                 {advertisements.map((ad, index) => (
//                   <div
//                     key={ad._id}
//                     className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
//                       index === currentAdIndex ? 'translate-x-0' : index < currentAdIndex ? '-translate-x-full' : 'translate-x-full'
//                     }`}
//                   >
//                     <div className="flex items-center justify-center h-full px-6 bg-gradient-to-r from-gray-50 to-white">
//                       {ad.mediaType === 'image' ? (
//                         <img src={ad.mediaUrl} alt={ad.name} className="max-h-full max-w-[200px] object-contain rounded-lg shadow-sm"
//                           onError={(e) => { e.target.style.display = 'none' }} />
//                       ) : (
//                         <video src={ad.mediaUrl} autoPlay muted loop className="max-h-full max-w-[200px] object-contain rounded-lg shadow-sm"
//                           onError={(e) => { e.target.style.display = 'none' }} />
//                       )}
//                       <div className="ml-6 flex-1 max-w-md">
//                         <h3 className="text-lg font-semibold text-gray-900 mb-1">{ad.name}</h3>
//                         <p className="text-sm text-gray-600">{ad.description}</p>
//                         <div className="mt-2">
//                           <span className="inline-block px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
//                             Featured
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//                 {advertisements.length > 1 && (
//                   <>
//                     <button onClick={prevAd} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all hover:scale-105">
//                       <FiChevronLeft className="w-5 h-5 text-gray-600" />
//                     </button>
//                     <button onClick={nextAd} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all hover:scale-105">
//                       <FiChevronRight className="w-5 h-5 text-gray-600" />
//                     </button>
//                   </>
//                 )}
//               </div>
//               {advertisements.length > 1 && (
//                 <div className="flex justify-center py-3 space-x-2 bg-gray-50">
//                   {advertisements.map((_, index) => (
//                     <button
//                       key={index}
//                       onClick={() => setCurrentAdIndex(index)}
//                       className={`w-2 h-2 rounded-full transition-all ${
//                         index === currentAdIndex ? 'bg-primary-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
//                       }`}
//                     />
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Auth Form Container */}
//           <div className="flex-1 flex items-center justify-center p-6 bg-white">
//             <div className="w-full max-w-md">
//               <div className="lg:hidden text-center mb-8">
//                 <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-4">
//                   <FiShield className="w-8 h-8 text-white" />
//                 </div>
//                 <h1 className="text-3xl font-bold text-gray-900 mb-2">
//                   Marketbook<span className="text-primary-600">&solution</span>
//                 </h1>
//                 <p className="text-gray-600">Professional marketplace management</p>
//               </div>
//               {children}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-white">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
//             <div className="col-span-1 md:col-span-2">
//               <div className="flex items-center mb-4">
//                 <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mr-3">
//                   <FiShield className="w-6 h-6 text-white" />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-bold">
//                     Marketbook<span className="text-primary-400">&solution</span>
//                   </h3>
//                   <p className="text-gray-400 text-sm">Professional Marketplace</p>
//                 </div>
//               </div>
//               <p className="text-gray-300 mb-4 max-w-md">
//                 Empowering businesses with professional marketplace management tools.
//                 Create, manage, and grow your business with our comprehensive platform.
//               </p>
//               <div className="space-y-2">
//                 <div className="flex items-center text-gray-300">
//                   <FiMail className="w-4 h-4 mr-2" />
//                   <span className="text-sm">support@marketbooksolution.com</span>
//                 </div>
//               </div>
//             </div>

//             <div>
//               <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
//               <ul className="space-y-2">
//                 <li><a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm">Features</a></li>
//                 <li><a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm">Pricing</a></li>
//                 <li><a href="#about" className="text-gray-300 hover:text-white transition-colors text-sm">About Us</a></li>
//                 <li><a href="#contact" className="text-gray-300 hover:text-white transition-colors text-sm">Contact</a></li>
//                 <li><Link to="/global-admin-login" className="text-gray-300 hover:text-white transition-colors text-sm">Admin Portal</Link></li>
//               </ul>
//             </div>

//             {/* About Us Replacement */}
//             <div>
//               <h3 className="font-semibold mb-2 text-white">About Us</h3>
//               <p className="text-gray-400 leading-relaxed">
//                 MarketbookSolution is designed to help your business stand out and operate more efficiently.
//                 With our platform, customers can easily find you, and you can manage your business like a pro.
//                 Send professional invoices, track payments, monitor pending or unpaid items, and stay on top
//                 of your sales—all in one place.
//               </p>
//             </div>
//           </div>

//           <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
//             <p className="text-gray-400 text-sm">© 2024 Marketbook&solution. All rights reserved.</p>
//           </div>
//         </div>
//       </footer>
//     </div>
//   )
// }



// add this without removing anything in the code and give me the update code Contact Us modal content  

// We’d love to hear from you! Whether you have questions, need support, or want to share feedback, our team is here to help.

// How to Reach Us

// Customer Support
// For assistance with your account, invoices, or technical issues, please reach out to us through our Support ticket and also you can email us :
// 📧 support@marketbooksolution.com

// We aim to respond to all inquiries within 24–48 hours. Thank you for choosing Marketbooksolution!








// Features modal content 
// Features

// Marketbooksolution offers a comprehensive set of features designed to simplify your business management and enhance your productivity. Here’s what you can expect:

// 1. Professional Invoicing

// Create, customize, and send polished invoices quickly. Keep a full history of all your invoices, making it easy to track payments and resend documents when needed.

// 2. Payment Tracking & Management

// Monitor your payments in real time. Instantly see which invoices are paid, pending, or overdue, helping you stay on top of your cash flow.

// 3. Full Administrative Control

// You maintain ultimate control with a secure admin password. Only you can edit or delete transactions, ensuring your records remain accurate and protected.

// 4. Staff User Management

// Create user accounts for your team with tailored access levels. Staff can handle routine tasks, while sensitive functions remain restricted to you.

// 5. Secure Data & Access

// All your business data—including sales, bookings, and client information—is protected from unauthorized changes and internal errors.

// 6. Customer Management

// Store and organize client contact details, invoice history, and payment status to maintain strong customer relationships.

// 7. Sales & Performance Insights

// Get clear insights into your sales trends and outstanding payments to help you make informed business decisions.

// 8. Smart Notifications & Alerts

// Receive reminders for overdue invoices, pending approvals, and important updates so you never miss a critical task.

// 9. Cloud Backup & Multi-Device Access

// Access your business data securely from any device, anytime. Your records are automatically backed up to prevent data loss.

// 10. Intuitive Dashboard

// A clean, easy-to-use dashboard lets you manage your entire business from one place, with real-time updates and quick navigation.

// ⸻

// Marketbooksolution is built to help you run your business smarter, safer, and more professionally. Experience the power of centralized management combined with robust security and user-friendly tools.





// About us modal content 

// About Marketbooksolution

// Marketbooksolution is a powerful business management app built to help entrepreneurs, freelancers, and small business owners operate with confidence and professionalism. Our goal is simple: to give you the tools you need to manage your business efficiently, protect your data, and grow with ease.

// With Marketbooksolution, your business becomes easier to find online, and your daily operations are streamlined. From sending branded invoices to tracking payments and managing pending or unpaid items, everything you need is in one place—organized, secure, and always accessible.

// Why Choose Marketbooksolution?
// 	•	Professional Invoicing
// Create and send customized invoices to your clients in seconds. Maintain a history of all your transactions and stay on top of what’s paid, pending, or overdue.
// 	•	Smart Payment Tracking
// Never miss a payment again. Our dashboard gives you a clear overview of your income, outstanding invoices, and payment history.
// 	•	Full Administrative Control
// You’re always in charge. Only you—the business owner—can edit or delete transactions using your secure admin password. Even if you assign user logins to your team, sensitive actions remain restricted to your admin access.
// 	•	Staff Access with Limitations
// Grant limited access to your staff for routine tasks, while keeping critical business functions like deleting records or altering payments under your control.
// 	•	Security & Accountability
// We prioritize your business’s security. Your sales, bookings, and financial records are protected against unauthorized changes, mistakes, or internal misuse.
// 	•	Customer & Sales Management
// Easily manage customer profiles, track sales performance, and generate insights that help you make smarter business decisions.
// 	•	Cloud Backup & Accessibility
// Your data is automatically backed up and accessible anytime, anywhere. Work securely across devices without losing valuable information.

// ⸻

// At Marketbooksolution, we believe every business—big or small—deserves professional tools that protect and empower. Our platform gives you the structure, security, and visibility you need to run your business with confidence.

// Grow smart. Stay secure. Work professionally—with Marketbooksolution.





// Once the About  in the header and footer is clicked it’s should pop out the about us modal 

// Once the Features in the header and footer is clicked  it’s should pop out the Features modal 

// Once the contact  in the header and footer is clicked it’s should pop out the contact modal 