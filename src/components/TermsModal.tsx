import { X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-25"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <header className="p-6 flex justify-between items-center border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-gray-900">Terms and Conditions</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="p-8 space-y-8 overflow-y-auto">
          <p className="text-gray-600">
            <strong>Last Updated:</strong> September 17, 2025<br/>
            Welcome to MindfulYou. By creating an account and using our services, you agree to these legally binding terms. Please read them carefully.
          </p>

          <div className="space-y-4 text-gray-700">
            
            {/* Section 1: Medical Disclaimer (Expanded) */}
            <h3 className="font-bold text-lg text-gray-800">1. Important Medical Disclaimer</h3>
            <p>
              MindfulYou provides tools and community support for personal wellness and is not a healthcare provider. The services, content (including text, graphics, images, and information), and AI features are for informational and educational purposes only. This application **is not a substitute for professional medical advice, diagnosis, or treatment**. 
            </p>
            <p>
              Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical or mental health condition. **Never disregard professional medical advice or delay in seeking it because of something you have read or experienced on this application.** If you believe you are in a crisis or may have a medical emergency, call 911 (or your local emergency number) immediately.
            </p>

            {/* Section 2: User Responsibility (Expanded) */}
            <h3 className="font-bold text-lg text-gray-800">2. User Responsibility and Community Conduct</h3>
            <p>
              You are solely responsible for the content you post and your interactions with other users. You agree to use MindfulYou in a lawful and respectful manner. You agree not to post content that is:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Harmful, threatening, abusive, or harassing.</li>
              <li>Instructional in nature regarding self-harm, violence, or illegal acts.</li>
              <li>Libelous, defamatory, or invasive of another's privacy.</li>
              <li>Infringing on any third party's intellectual property rights.</li>
            </ul>
            <p>
              We reserve the right, but have no obligation, to monitor disputes and remove content that violates these terms or our community guidelines.
            </p>

            {/* Section 3: User-Generated Content */}
            <h3 className="font-bold text-lg text-gray-800">3. User-Generated Content</h3>
            <p>
              By posting content on MindfulYou, you grant us a non-exclusive, royalty-free, worldwide license to use, display, reproduce, and distribute your content in connection with the service. You retain all other rights to your content. This license allows us to operate and improve the application.
            </p>

            {/* Section 4: Limitation of Liability (Expanded) */}
            <h3 className="font-bold text-lg text-gray-800">4. Disclaimer of Warranties and Limitation of Liability</h3>
            <p>
              The MindfulYou application is provided on an "as is" and "as available" basis without any warranties of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
            <p>
              To the fullest extent permitted by law, **MindfulYou, its affiliates, and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from (a) your access to or use of or inability to access or use the service; (b) any conduct or content of any third party on the service; or (c) unauthorized access, use, or alteration of your transmissions or content.**
            </p>
            
            {/* Section 5: Account Termination */}
            <h3 className="font-bold text-lg text-gray-800">5. Account Termination</h3>
            <p>
              We may suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms and Conditions or is harmful to other users of the application, us, or third parties, or for any other reason.
            </p>

            {/* Section 6: Intellectual Property */}
            <h3 className="font-bold text-lg text-gray-800">6. Intellectual Property</h3>
            <p>
              All content on this application, including the design, text, graphics, and logos, is the property of MindfulYou and is protected by copyright and other intellectual property laws. You may not use any of our intellectual property without our prior written consent.
            </p>
            
            {/* Section 7: Changes to Terms */}
            <h3 className="font-bold text-lg text-gray-800">7. Changes to These Terms</h3>
            <p>
              We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new terms on this page. Your continued use of the application after such changes constitutes your acceptance of the new terms.
            </p>
          </div>
        </div>

        <footer className="p-6 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-2xl z-10">
          <button
            onClick={onClose}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          >
            I Understand and Agree
          </button>
        </footer>
      </div>
    </div>
  );
}