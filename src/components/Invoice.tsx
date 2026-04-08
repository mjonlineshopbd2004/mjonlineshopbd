import React from 'react';
import { Order } from '../types';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { SiteSettings } from '../contexts/SettingsContext';
import { QRCodeSVG } from 'qrcode.react';

interface InvoiceProps {
  order: Order;
  settings: SiteSettings;
}

export const Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, settings }, ref) => {
  const [logoError, setLogoError] = React.useState(false);
  // Exact colors from the Axport Marine reference image
  const colors = {
    white: '#ffffff',
    navy: '#1a2b4b', // Deep navy header
    lightNavy: '#2d3e5d',
    rowBlue: '#f0f4ff', // Very light blue for alternating rows
    gray50: '#f8fafc',
    gray100: '#f1f5f9',
    gray200: '#e2e8f0',
    gray400: '#94a3b8',
    gray500: '#64748b',
    gray600: '#475569',
    gray700: '#334155',
    gray900: '#0f172a',
    accent: '#f97316', // Orange from logo
  };

  const qrData = `Order ID: #${order.id.slice(-8).toUpperCase()}\nDate: ${new Date(order.createdAt).toLocaleDateString()}\nCustomer: ${order.customerName}\nTotal: ${formatPrice(order.total)}`;

  const styles = {
    container: {
      width: '210mm', // Exact A4 width
      minWidth: '210mm',
      height: '297mm', // Exact A4 height
      minHeight: '297mm',
      margin: '0 auto',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      backgroundColor: colors.white,
      color: colors.gray900,
      fontFamily: "'Inter', sans-serif",
      boxSizing: 'border-box' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      WebkitPrintColorAdjust: 'exact' as any,
      printColorAdjust: 'exact' as any,
      padding: '0',
    },
    watermark: {
      position: 'absolute' as const,
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none' as const,
      zIndex: 0,
      opacity: 0.02,
    },
    header: {
      height: '190px',
      padding: '25px 40px',
      backgroundColor: colors.navy,
      color: colors.white,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      position: 'relative' as const,
      flexShrink: 0,
    },
    headerCurve: {
      position: 'absolute' as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: '300px',
      zIndex: 1,
    },
    content: {
      padding: '30px 40px',
      position: 'relative' as const,
      zIndex: 10,
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
    },
    addressSection: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '40px',
      marginBottom: '20px',
    },
    addressTitle: {
      fontSize: '14px',
      fontWeight: '800',
      color: colors.navy,
      marginBottom: '8px',
      borderBottom: `2px solid ${colors.gray200}`,
      paddingBottom: '4px',
      textTransform: 'uppercase' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '20px',
    },
    th: {
      padding: '10px 15px',
      fontSize: '12px',
      fontWeight: '900',
      textAlign: 'left' as const,
      backgroundColor: colors.accent,
      color: colors.white,
      borderRight: `1px solid ${colors.white}`,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    td: {
      padding: '10px 15px',
      fontSize: '13px',
      color: colors.gray900,
      borderRight: `1px solid ${colors.gray200}`,
      verticalAlign: 'middle' as const,
      fontWeight: '500',
      height: '35px',
    },
    summaryContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'flex-end',
      gap: '2px',
      marginBottom: '20px',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      width: '180px',
      fontSize: '12px',
      fontWeight: '600',
      color: colors.gray600,
      padding: '1px 0',
    },
    totalBox: {
      display: 'flex',
      justifyContent: 'space-between',
      width: '220px',
      padding: '8px 15px',
      backgroundColor: '#eef2ff',
      borderRadius: '4px',
      marginTop: '4px',
    },
    footer: {
      padding: '20px 40px',
      borderTop: `1px solid ${colors.gray200}`,
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      fontWeight: '600',
      color: colors.gray500,
      backgroundColor: colors.white,
      flexShrink: 0,
    },
    bottomSection: {
      marginTop: 'auto',
      paddingTop: '40px',
      paddingBottom: '40px',
      borderTop: `1px solid ${colors.gray100}`,
    }
  };

  return (
    <div ref={ref} style={styles.container}>
      {/* Watermark Logo */}
      <div style={styles.watermark}>
        {settings.logoUrl && !logoError && (
          <img 
            src={getProxyUrl(settings.logoUrl)} 
            alt="" 
            style={{ width: '400px', opacity: 0.05 }}
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
          />
        )}
      </div>

      {/* Header */}
      <div style={styles.header}>
        {/* Curved Pattern SVG */}
        <div style={styles.headerCurve}>
          <svg width="300" height="180" viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M300 0H40C80 50 0 130 40 180H300V0Z" fill="rgba(255,255,255,0.05)" />
            <path d="M300 0H80C120 50 40 130 80 180H300V0Z" fill="rgba(255,255,255,0.03)" />
            <path d="M300 20C260 20 240 60 260 100C280 140 260 170 220 170" stroke="rgba(255,255,255,0.08)" strokeWidth="25" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 2, color: colors.white }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <div style={{ backgroundColor: colors.white, padding: '6px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {settings.logoUrl && !logoError ? (
                <img 
                  src={getProxyUrl(settings.logoUrl)} 
                  alt={settings.storeName} 
                  style={{ height: '45px', width: 'auto' }}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div style={{ width: '45px', height: '45px', backgroundColor: colors.navy, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.white, fontWeight: '900', fontSize: '20px' }}>
                  {settings.storeName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: colors.white, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{settings.storeName}</h1>
              <p style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 1, margin: 0, color: colors.white }}>{settings.shopTagline}</p>
            </div>
          </div>
          
          <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#ffffff' }}>
            <p style={{ fontWeight: '900', margin: '0 0 2px 0', fontSize: '13px', color: '#ffffff' }}>{settings.storeName}</p>
            <p style={{ margin: 0, fontWeight: '600', color: '#ffffff' }}>{settings.address}</p>
            <p style={{ margin: 0, fontWeight: '600', color: '#ffffff' }}>Tel: {settings.phone}</p>
            <p style={{ margin: 0, fontWeight: '600', color: '#ffffff' }}>Email: {settings.email}</p>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'right' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '900', margin: '0 0 5px 0', lineHeight: 1, color: colors.white, letterSpacing: '0.05em' }}>INVOICE</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
              <span style={{ opacity: 0.8, fontWeight: '700' }}>Order ID</span>
              <span style={{ fontWeight: '900' }}>#{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
              <span style={{ opacity: 0.8, fontWeight: '700' }}>Invoice Date</span>
              <span style={{ fontWeight: '900' }}>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
              <span style={{ opacity: 0.8, fontWeight: '700' }}>Due Date</span>
              <span style={{ fontWeight: '900' }}>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Bill To & Ship To */}
        <div style={styles.addressSection}>
          <div>
            <h3 style={styles.addressTitle}>Billed To:</h3>
            <div style={{ fontSize: '12px', lineHeight: '1.4', color: colors.gray700 }}>
              <p style={{ fontWeight: '700', fontSize: '13px', color: colors.gray900, marginBottom: '1px' }}>{order.customerName}</p>
              <p style={{ margin: 0 }}>{order.customerEmail}</p>
              <p style={{ margin: 0 }}>{order.phone}</p>
            </div>
          </div>
          <div>
            <h3 style={styles.addressTitle}>Ship To:</h3>
            <div style={{ fontSize: '12px', lineHeight: '1.4', color: colors.gray700 }}>
              <p style={{ fontWeight: '700', margin: 0 }}>{order.address}</p>
              <p style={{ fontSize: '10px', fontWeight: '700', color: colors.gray500, marginTop: '2px' }}>Delivery Area: {order.deliveryArea}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ ...styles.table, border: `1px solid ${colors.gray200}` }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>No.</th>
              <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Image</th>
              <th style={styles.th}>Description</th>
              <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Qty</th>
              <th style={{ ...styles.th, width: '100px', textAlign: 'right' }}>Unit Price</th>
              <th style={{ ...styles.th, width: '100px', textAlign: 'right', borderRight: 'none' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? colors.white : '#fdf2f0' }}>
                <td style={{ ...styles.td, textAlign: 'center', color: colors.gray500, fontWeight: '700' }}>{idx + 1}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <img 
                    src={getProxyUrl(item.images[0])} 
                    alt="" 
                    style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${colors.gray200}` }}
                    referrerPolicy="no-referrer"
                  />
                </td>
                <td style={styles.td}>
                  <p style={{ fontWeight: '800', margin: 0, color: colors.navy, fontSize: '13px' }}>{item.name}</p>
                  <p style={{ fontSize: '10px', color: colors.gray600, margin: '2px 0 0 0', fontWeight: '700' }}>
                    {item.selectedSize && `Size: ${item.selectedSize}`}
                    {item.selectedColor && ` | Color: ${item.selectedColor}`}
                  </p>
                </td>
                <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700' }}>{item.quantity}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700' }}>{formatPrice(item.discountPrice || item.price)}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: '800', color: colors.navy, borderRight: 'none' }}>{formatPrice((item.discountPrice || item.price) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={styles.summaryContainer}>
          <div style={styles.summaryRow}>
            <span>Subtotal</span>
            <span style={{ color: colors.gray900 }}>{formatPrice(order.subtotal)}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Delivery</span>
            <span style={{ color: colors.gray900 }}>{formatPrice(order.deliveryCharge)}</span>
          </div>
          <div style={styles.totalBox}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: colors.navy }}>Amount Due</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: colors.navy }}>{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Bottom Info Section (Fixed at bottom) */}
        <div style={styles.bottomSection}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: colors.navy, marginBottom: '6px', textTransform: 'uppercase' }}>Payment Info</h4>
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px', color: colors.gray700 }}>
                  <p style={{ margin: 0 }}>Method: <span style={{ fontWeight: '800', color: colors.gray900 }}>{order.paymentMethod}</span></p>
                  <p style={{ margin: 0 }}>Status: <span style={{ fontWeight: '800', color: colors.gray900 }}>{order.paymentStatus}</span></p>
                  <p style={{ margin: 0 }}>Type: <span style={{ fontWeight: '800', color: colors.gray900 }}>{order.paymentType}</span></p>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: colors.navy, marginBottom: '6px', textTransform: 'uppercase' }}>Notes</h4>
                <p style={{ fontSize: '10px', color: colors.gray600, lineHeight: '1.4', margin: 0, fontWeight: '600' }}>
                  Please send proof of payment to {settings.email}.<br />
                  For inquiries, contact our billing team at {settings.phone}.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ padding: '6px', backgroundColor: colors.white, border: `1px solid ${colors.gray200}`, borderRadius: '8px' }}>
                <QRCodeSVG value={qrData} size={70} />
              </div>
              <p style={{ fontSize: '8px', fontWeight: '800', color: colors.gray500, marginTop: '6px', textTransform: 'uppercase' }}>Scan to Verify</p>
            </div>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', minHeight: '110px', position: 'relative' }}>
              <div style={{ width: '100%', marginBottom: '8px', paddingBottom: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80px', justifyContent: 'flex-end', position: 'relative' }}>
                {/* Signature Text - Reduced size */}
                <p style={{ 
                  fontFamily: "'Dancing Script', cursive", 
                  fontSize: '42px', 
                  color: colors.navy, 
                  margin: '0 0 -2px 0', 
                  lineHeight: 1,
                  fontWeight: '700',
                  letterSpacing: '-0.5px',
                  zIndex: 2,
                  transform: 'rotate(-1deg)'
                }}>Mamun</p>
                
                {/* Leaf Underline Decoration (SVG) - Reduced size */}
                <div style={{ position: 'absolute', bottom: '0px', width: '160px', height: '36px', pointerEvents: 'none' }}>
                  <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                    {/* Main Underline Path */}
                    <path d="M10 50C60 48 110 48 160 50" stroke={colors.navy} strokeWidth="2.5" strokeLinecap="round" />
                    
                    {/* Leaf 1 (Bottom) */}
                    <path d="M160 50C175 42 195 42 205 50C195 58 175 58 160 50Z" fill={colors.navy} />
                    <path d="M165 50C175 46 185 46 195 50" stroke="white" strokeWidth="0.6" opacity="0.3" />
                    
                    {/* Leaf 2 (Top) */}
                    <path d="M170 45C182 30 198 28 208 38C198 48 182 52 170 45Z" fill={colors.navy} />
                    <path d="M175 43C185 38 195 38 202 42" stroke="white" strokeWidth="0.6" opacity="0.3" />
                  </svg>
                </div>
              </div>
              {/* Standard line for the signature area */}
              <div style={{ width: '100%', borderBottom: `1px solid ${colors.gray200}`, marginBottom: '6px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: colors.gray500, margin: 0, letterSpacing: '0.05em' }}>Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={{ margin: 0 }}>Thank you for your business! Visit us again at {settings.storeName}</p>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>Email: <span style={{ color: colors.navy, fontWeight: '800' }}>{settings.email}</span></p>
          <p style={{ margin: 0 }}>Website: <span style={{ color: colors.navy, fontWeight: '800' }}>www.mjonlineshopbd.com</span></p>
          <p style={{ margin: 0 }}>Tel: <span style={{ color: colors.navy, fontWeight: '800' }}>{settings.phone}</span></p>
        </div>
      </div>
    </div>
  );
});

Invoice.displayName = 'Invoice';
