import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '../components/Button';
import Footer from '../components/Footer';
import Input from '../components/Input';
import Navbar from '../components/Navbar';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      message: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      // In production, this would send to your backend
      console.log('Contact form submitted:', values);
      setSubmitted(true);
      reset();
      window.setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error('Failed to submit contact form:', error);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar isPublic />

      {/* Hero */}
      <section className="border-b border-border px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="section-label">Get In Touch</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Contact Us</h1>
          <p className="mt-4 text-text2">
            Have questions? We'd love to hear from you. Send us a message and we'll
            respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">Get in touch</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Mail size={20} className="mt-1 text-brand flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text">Email</p>
                    <p className="mt-1 text-sm text-text2">support@contextos.io</p>
                    <p className="text-sm text-text2">hello@contextos.io</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Phone size={20} className="mt-1 text-brand flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text">Phone</p>
                    <p className="mt-1 text-sm text-text2">+1 (555) 000-0000</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MapPin size={20} className="mt-1 text-brand flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text">Office</p>
                    <p className="mt-1 text-sm text-text2">
                      123 Tech Boulevard
                      <br />
                      San Francisco, CA 94105
                      <br />
                      United States
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="mt-12 space-y-4">
                <div className="rounded-lg border border-border bg-bg2 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text3">
                    Response Time
                  </p>
                  <p className="text-sm text-text">Within 24 hours for most inquiries</p>
                </div>
                <div className="rounded-lg border border-border bg-bg2 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text3">
                    Availability
                  </p>
                  <p className="text-sm text-text">Monday - Friday, 9am - 6pm PST</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="rounded-lg border border-border bg-bg2 p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                    <svg className="h-6 w-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-text">Message sent!</h3>
                  <p className="mt-2 text-sm text-text2">
                    Thanks for reaching out. We'll get back to you soon.
                  </p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <Input
                      label="Name"
                      placeholder="Your name"
                      error={errors.name?.message}
                      {...register('name')}
                    />
                  </div>
                  <div>
                    <Input
                      label="Email"
                      type="email"
                      placeholder="your@email.com"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                  </div>
                  <div>
                    <Input
                      label="Company (optional)"
                      placeholder="Your company"
                      error={errors.company?.message}
                      {...register('company')}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text2">
                      Message
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-border bg-bg3 px-3 py-2 text-sm text-text placeholder-text3 outline-none ring-brand transition focus:border-border-strong focus:ring-1"
                      placeholder="Tell us what you're interested in..."
                      rows={4}
                      {...register('message')}
                    />
                    {errors.message?.message && (
                      <p className="mt-1 text-xs text-error">{errors.message.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <p className="section-label">FAQs</p>
            <h2 className="mt-2 text-2xl font-semibold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'What is ContextOS?',
                a: 'ContextOS is a unified data intelligence platform that helps you connect, query, and visualize data from multiple sources.',
              },
              {
                q: 'Is there a free tier?',
                a: 'Yes! Our Starter plan is completely free and includes 5 team members and 100 AI queries per month.',
              },
              {
                q: 'How does billing work?',
                a: 'We offer simple, transparent pricing with monthly or annual billing options. You can upgrade or downgrade anytime.',
              },
              {
                q: 'Can I import data from existing sources?',
                a: 'Absolutely. We support 100+ integrations with popular data sources and APIs.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-bg2 p-4">
                <p className="font-medium text-text">{faq.q}</p>
                <p className="mt-2 text-sm text-text2">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;

