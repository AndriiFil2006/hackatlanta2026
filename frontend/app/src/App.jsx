import './App.css'

function Navbar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 60px', background: 'rgba(10,10,10,0.95)',
      borderBottom: '1px solid rgba(212,175,55,0.2)'
    }}>
      <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', letterSpacing: '4px', color: '#D4AF37' }}>
        Jackpot<span style={{ color: '#E74C3C' }}>Tech</span>
      </div>
      <div style={{ display: 'flex', gap: '32px' }}>
        {['Deals','Laptops','Gaming','Phones','Audio'].map(link => (
          <a key={link} href="#" style={{ color: 'rgba(245,240,232,0.7)', textDecoration: 'none', letterSpacing: '2px', fontSize: '0.85rem', textTransform: 'uppercase' }}>{link}</a>
        ))}
      </div>
      <button style={{ background: 'linear-gradient(135deg,#D4AF37,#9A7B1A)', border: 'none', padding: '10px 24px', color: '#000', fontWeight: 700, cursor: 'pointer', letterSpacing: '1px' }}>
        🎰 Hot Picks
      </button>
    </nav>
  )
}

function Ticker() {
  const items = ['MACBOOK PRO M4 — 22% OFF','SONY WH-1000XM6 — LIMITED STOCK','RTX 5090 GPU — JACKPOT DEAL','SAMSUNG S25 ULTRA — NEW ARRIVAL','PS5 PRO BUNDLE — EXCLUSIVE','DELL XPS 16 — 18% OFF TODAY']
  return (
    <div style={{ background: '#C0392B', padding: '14px 0', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '80px' }}>
      <div style={{ display: 'inline-flex', gap: '80px', animation: 'ticker 30s linear infinite' }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1rem', letterSpacing: '3px', color: 'white' }}>♦ {item}</span>
        ))}
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: 'radial-gradient(ellipse at center, #0D3D25 0%, #081F14 40%, #0A0A0A 100%)',
      padding: '0 60px', width: '100%'
    }}>
      <div style={{ maxWidth: '700px' }}>
        <div style={{ color: '#D4AF37', letterSpacing: '3px', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '24px' }}>
          ♠ Limited Time Offers
        </div>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '5rem', fontWeight: 900, lineHeight: 1, marginBottom: '24px', color: '#F5F0E8' }}>
          Bet on the<br />
          <span style={{ color: '#D4AF37' }}>Best Tech.</span><br />
          Always Win.
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: '1.1rem', marginBottom: '40px', maxWidth: '480px', lineHeight: 1.7 }}>
          Premium electronics at odds you can't refuse. Every deal is a jackpot.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button style={{ background: 'linear-gradient(135deg,#D4AF37,#B8941E)', border: 'none', padding: '16px 36px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '2px' }}>
            ROLL THE DEALS ♠
          </button>
          <button style={{ background: 'transparent', border: '1px solid rgba(245,240,232,0.25)', padding: '16px 36px', color: '#F5F0E8', cursor: 'pointer', letterSpacing: '2px' }}>
            VIEW ALL ♦
          </button>
        </div>
        <div style={{ display: 'flex', gap: '48px', marginTop: '64px', paddingTop: '48px', borderTop: '1px solid rgba(212,175,55,0.1)' }}>
          {[['12K+','Products'],['98%','Win Rate'],['$2M+','Saved']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2.5rem', color: '#D4AF37' }}>{num}</div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,240,232,0.5)', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductCard({ name, price, oldPrice, emoji, badge, category }) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(212,175,55,0.15)', overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', background: '#0A0A0A', position: 'relative' }}>
        {badge && <div style={{ position: 'absolute', top: 12, left: 12, background: '#C0392B', color: 'white', padding: '4px 10px', fontSize: '0.7rem', letterSpacing: '1px' }}>{badge}</div>}
        {emoji}
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ color: '#D4AF37', fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>{category}</div>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '1rem', fontWeight: 700, color: '#F5F0E8', marginBottom: '12px' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.6rem', color: '#D4AF37' }}>{price}</span>
          <span style={{ color: 'rgba(245,240,232,0.35)', textDecoration: 'line-through', fontSize: '0.9rem' }}>{oldPrice}</span>
        </div>
        <button style={{ width: '100%', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', padding: '12px', cursor: 'pointer', letterSpacing: '2px', fontSize: '0.85rem' }}>
          ADD TO HAND ♠
        </button>
      </div>
    </div>
  )
}

function Products() {
  const items = [
    { name: 'MacBook Pro 16" M4 Max', price: '$2,799', oldPrice: '$3,599', emoji: '💻', badge: '🔥 HOT', category: 'Laptop · Apple' },
    { name: 'Sony WH-1000XM6', price: '$279', oldPrice: '$399', emoji: '🎧', badge: '♦ DEAL', category: 'Audio · Sony' },
    { name: 'GeForce RTX 5090', price: '$1,999', oldPrice: '$2,499', emoji: '🎮', badge: '♣ NEW', category: 'GPU · NVIDIA' },
    { name: 'iPhone 17 Pro Max', price: '$1,199', oldPrice: '$1,399', emoji: '📱', badge: '', category: 'Phone · Apple' },
  ]
  return (
    <section style={{ padding: '100px 60px', background: '#0D3D25' }}>
      <div style={{ color: '#D4AF37', letterSpacing: '4px', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '16px' }}>♣ Today's Table</div>
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '48px' }}>Deal of the Day</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {items.map(item => <ProductCard key={item.name} {...item} />)}
      </div>
    </section>
  )
}

function Categories() {
  const cats = [
    { icon: '💻', name: 'Laptops', count: '248 items' },
    { icon: '📱', name: 'Phones', count: '185 items' },
    { icon: '🎮', name: 'Gaming', count: '320 items' },
    { icon: '🎧', name: 'Audio', count: '142 items' },
    { icon: '📺', name: 'Displays', count: '96 items' },
    { icon: '⌚', name: 'Wearables', count: '77 items' },
  ]
  return (
    <section style={{ padding: '100px 60px', background: '#0A0A0A' }}>
      <div style={{ color: '#D4AF37', letterSpacing: '4px', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '16px' }}>♥ Browse the Floor</div>
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '48px' }}>Play Your Category</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ background: '#141414', border: '1px solid rgba(212,175,55,0.08)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '12px' }}>{cat.icon}</div>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '0.95rem', letterSpacing: '2px', color: 'rgba(245,240,232,0.8)' }}>{cat.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#D4AF37', marginTop: '6px' }}>{cat.count}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Banner() {
  return (
    <section style={{ padding: '0 60px 80px', background: '#0A0A0A' }}>
      <div style={{ background: 'linear-gradient(135deg, #0D3D25, #081F14)', border: '1px solid rgba(212,175,55,0.2)', padding: '60px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#F5F0E8', marginBottom: '12px', lineHeight: 1.1 }}>
            The House Always<br /><em style={{ color: '#D4AF37' }}>Rewards You.</em>
          </h2>
          <p style={{ color: 'rgba(245,240,232,0.6)', maxWidth: '420px' }}>Join JackpotTech VIP for exclusive drops, early access, and cashback on every purchase.</p>
        </div>
        <button style={{ background: 'linear-gradient(135deg,#D4AF37,#B8941E)', border: 'none', padding: '16px 36px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
          JOIN VIP TABLE ♠
        </button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background: '#060606', borderTop: '1px solid rgba(212,175,55,0.1)', padding: '40px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#D4AF37' }}>Jackpot<span style={{ color: '#E74C3C' }}>Tech</span></div>
      <div style={{ color: 'rgba(245,240,232,0.25)', fontSize: '0.75rem', letterSpacing: '1px' }}>© 2026 JackpotTech. All rights reserved.</div>
      <div style={{ color: 'rgba(212,175,55,0.3)', fontSize: '1rem', letterSpacing: '8px' }}>♠ ♥ ♦ ♣</div>
    </footer>
  )
}

function App() {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', margin: 0, padding: 0 }}>
      <Navbar />
      <Ticker />
      <Hero />
      <Products />
      <Categories />
      <Banner />
      <Footer />
    </div>
  )
}

export default App