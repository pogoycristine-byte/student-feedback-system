import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const canvasRef = useRef(null);
  const [forgotError, setForgotError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let x = 0;
    let y = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      x -= 3;
      y -= 2;
      if (x < -w * 2) x = 0;
      if (y < -h * 2) y = 0;

      ctx.fillStyle = '#0a0412';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(x, y);

      const grd = ctx.createLinearGradient(0, h * 4, w * 4, 0);
      grd.addColorStop(0,    '#0a0412');
      grd.addColorStop(0.15, '#2d0010');
      grd.addColorStop(0.3,  '#7b0f3a');
      grd.addColorStop(0.45, '#3b1472');
      grd.addColorStop(0.6,  '#9b2c6e');
      grd.addColorStop(0.75, '#4a1a8a');
      grd.addColorStop(0.88, '#2d0010');
      grd.addColorStop(1,    '#0a0412');

      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w * 4, h * 4);
      ctx.restore();

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light-mode');
    document.body.classList.remove('light-mode');
  }, []);

  const [error, setError] = useState(() => {
    const saved = localStorage.getItem('login_error');
    if (saved) { localStorage.removeItem('login_error'); return saved; }
    return '';
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      localStorage.removeItem('login_error');
      navigate('/dashboard');
    } else {
      localStorage.setItem('login_error', result.message);
      setError(result.message);
    }
    setLoading(false);
  };

  const handleForgotSendCode = async () => {
    if (!forgotEmail) { setForgotError('Please enter your email.'); return; }
    setForgotError('');
    setForgotLoading(true);
    setTimeout(() => { setForgotLoading(false); setForgotStep(2); }, 1200);
  };

  const handleForgotVerifyCode = async () => {
    if (!forgotCode) { setForgotError('Please enter the code.'); return; }
    setForgotError('');
    setForgotLoading(true);
    setTimeout(() => { setForgotLoading(false); setForgotStep(3); }, 1000);
  };

  const handleForgotResetPassword = async () => {
    if (!newPassword || !confirmPassword) { setForgotError('Please fill in all fields.'); return; }
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setForgotError('Password must be at least 6 characters.'); return; }
    setForgotError('');
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotCode('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotCode('');
    setForgotError('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', overflow: 'hidden',
      display: 'flex', background: '#0f0720',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
    }}>
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0,
      }} />

      <div style={{
        position: 'absolute', top: '40px', left: '-10px', width: '60%',
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        zIndex: 2, pointerEvents: 'none',
        padding: '0 24px', gap: '14px',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '36px', fontWeight: 900, lineHeight: 1,
          color: '#ffffff', margin: 0,
          textShadow: '0 4px 30px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}>
          Class<span style={{ color: '#c4b5fd', fontStyle: 'italic' }}>Back</span>
        </h1>
        <div style={{
          width: 2, height: 28,
          background: 'linear-gradient(180deg,#6D28D9,#BE185D)',
          borderRadius: 2, flexShrink: 0,
        }} />
        <p style={{
          fontSize: '20px', fontWeight: 500,
          color: 'rgba(228, 224, 224, 0.85)',
          letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: 1.3,
          margin: 0, whiteSpace: 'nowrap',
        }}>
          Classroom Feedback &amp; Suggestion System
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer{ 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

        .fu1{animation:fadeUp 0.6s ease 0.0s both}
        .fu2{animation:fadeUp 0.6s ease 0.1s both}
        .fu3{animation:fadeUp 0.6s ease 0.2s both}
        .fu4{animation:fadeUp 0.6s ease 0.3s both}
        .fu5{animation:fadeUp 0.6s ease 0.4s both}

        .inp-wrap { position: relative; display: flex; align-items: center; }
        .inp-icon {
          position: absolute; left: 13px;
          color: rgba(0,0,0,0.6);
          pointer-events: none;
          display: flex; align-items: center;
        }
        .inp-eye {
          position: absolute; right: 13px;
          color: rgba(0,0,0,0.6);
          cursor: pointer;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .inp-eye:hover { color: rgba(167,139,250,0.9); }

        .inp {
          width:100%; padding:13px 16px 13px 40px;
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; color:#fff;
          font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; transition:all 0.25s;
        }
        .inp:focus {
          background:rgba(109,40,217,0.12);
          border-color:rgba(167,139,250,0.6);
          box-shadow:0 0 0 3px rgba(109,40,217,0.15);
        }
        .inp::placeholder { color:rgba(255,255,255,0.22) }

        .inp-pass {
          width:100%; padding:13px 42px 13px 40px;
          background:rgba(255,255,255,0.07);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; color:#fff;
          font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; transition:all 0.25s;
        }
        .inp-pass:focus {
          background:rgba(109,40,217,0.12);
          border-color:rgba(167,139,250,0.6);
          box-shadow:0 0 0 3px rgba(109,40,217,0.15);
        }
        .inp-pass::placeholder { color:rgba(255,255,255,0.22) }

        .inp-light {
          width:100%; padding:13px 16px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:10px; color:#fff;
          font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; transition:all 0.25s;
        }
        .inp-light:focus {
          background:rgba(109,40,217,0.15);
          border-color:rgba(167,139,250,0.6);
          box-shadow:0 0 0 3px rgba(109,40,217,0.15);
        }
        .inp-light::placeholder { color:rgba(255,255,255,0.25) }

        .btn {
          width:100%; padding:14px;
          background:linear-gradient(135deg,#6D28D9,#9333ea 50%,#BE185D);
          border:none; border-radius:10px; color:#fff;
          font-size:15px; font-weight:700;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:all 0.25s; letter-spacing:0.4px;
        }
        .btn:hover { opacity:0.9; transform:translateY(-1px); box-shadow:0 10px 30px rgba(109,40,217,0.5) }
        .btn:disabled { opacity:0.5; cursor:not-allowed; transform:none }

        .modal-overlay {
          position:fixed; inset:0; z-index:1000;
          background:rgba(0,0,0,0.7); backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center;
        }
        .modal-box {
          background:linear-gradient(160deg,#1a0b2e,#0f0720);
          border:1px solid rgba(167,139,250,0.2);
          border-radius:20px; padding:36px;
          width:100%; max-width:420px;
          animation:modalIn 0.3s ease both;
          position:relative;
        }
      `}</style>

      {showForgotModal && (
        <div className="modal-overlay" onClick={closeForgotModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button onClick={closeForgotModal} style={{
              position:'absolute', top:16, right:16,
              background:'rgba(255,255,255,0.08)', border:'none',
              borderRadius:'50%', width:32, height:32,
              color:'rgba(255,255,255,0.6)', fontSize:16,
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>

            <div style={{ display:'flex', gap:8, marginBottom:24 }}>
              {[1,2,3].map(s => (
                <div key={s} style={{
                  flex:1, height:3, borderRadius:2,
                  background: forgotStep >= s ? 'linear-gradient(90deg,#6D28D9,#BE185D)' : 'rgba(255,255,255,0.1)',
                  transition:'all 0.3s',
                }} />
              ))}
            </div>

            {forgotStep === 1 && (
              <>
                <div style={{ fontSize:28, marginBottom:8 }}>🔐</div>
                <h3 style={{ color:'#fff', fontSize:20, fontWeight:700, marginBottom:6 }}>Forgot Password?</h3>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:24, lineHeight:1.6 }}>
                  Enter your email address and we'll send a verification code to reset your password.
                </p>
                {forgotError && (
                  <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, fontSize:13, color:'#fca5a5', display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} /> {forgotError}
                  </div>
                )}
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>Email Address</label>
                <input className="inp-light" type="email" placeholder="Enter your email" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForgotSendCode()}
                  style={{ marginBottom:20 }} />
                <button className="btn" onClick={handleForgotSendCode} disabled={forgotLoading}>
                  {forgotLoading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <svg style={{ animation:'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                      Sending...
                    </span>
                  ) : 'Send Code to Gmail →'}
                </button>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <div style={{ fontSize:28, marginBottom:8 }}>📬</div>
                <h3 style={{ color:'#fff', fontSize:20, fontWeight:700, marginBottom:6 }}>Check Your Gmail</h3>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:4, lineHeight:1.6 }}>We sent a verification code to:</p>
                <p style={{ color:'#a78bfa', fontSize:14, fontWeight:600, marginBottom:24 }}>{forgotEmail}</p>
                {forgotError && (
                  <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, fontSize:13, color:'#fca5a5', display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} /> {forgotError}
                  </div>
                )}
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>Verification Code</label>
                <input className="inp-light" type="text" placeholder="Enter 6-digit code" value={forgotCode}
                  onChange={e => setForgotCode(e.target.value)} maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && handleForgotVerifyCode()}
                  style={{ marginBottom:8, letterSpacing:6, fontSize:18, textAlign:'center' }} />
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:20, textAlign:'center' }}>
                  Didn't receive it?{' '}
                  <span onClick={() => { setForgotStep(1); setForgotError(''); }} style={{ color:'#a78bfa', cursor:'pointer' }}>Resend code</span>
                </p>
                <button className="btn" onClick={handleForgotVerifyCode} disabled={forgotLoading}>
                  {forgotLoading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <svg style={{ animation:'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                      Verifying...
                    </span>
                  ) : 'Verify Code →'}
                </button>
              </>
            )}

            {forgotStep === 3 && (
              <>
                <div style={{ fontSize:28, marginBottom:8 }}>🔑</div>
                <h3 style={{ color:'#fff', fontSize:20, fontWeight:700, marginBottom:6 }}>Set New Password</h3>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:24, lineHeight:1.6 }}>Create a new password for your account.</p>
                {forgotError && (
                  <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, fontSize:13, color:'#fca5a5', display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} /> {forgotError}
                  </div>
                )}
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>New Password</label>
                <input className="inp-light" type="password" placeholder="Enter new password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} style={{ marginBottom:14 }} />
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>Confirm Password</label>
                <input className="inp-light" type="password" placeholder="Confirm new password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} style={{ marginBottom:20 }} />
                <button className="btn" onClick={handleForgotResetPassword} disabled={forgotLoading}>
                  {forgotLoading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <svg style={{ animation:'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                      Saving...
                    </span>
                  ) : 'Reset Password →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LEFT panel ── */}
      <div style={{
        width: '60%', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1, background: 'transparent', padding: '151px 0 40px 0',
      }}>
        {[
          { top:'10%', left:'12%', size:5, c:'#a78bfa', d:'0s' },
          { top:'25%', left:'70%', size:3, c:'#f472b6', d:'0.8s' },
          { top:'65%', left:'10%', size:4, c:'#a78bfa', d:'1.4s' },
          { top:'80%', left:'60%', size:3, c:'#f472b6', d:'0.4s' },
          { top:'45%', left:'45%', size:3, c:'#c4b5fd', d:'1s' },
        ].map((s, i) => (
          <div key={i} style={{
            position:'absolute', top:s.top, left:s.left,
            width:s.size, height:s.size, borderRadius:'50%',
            background:s.c, boxShadow:`0 0 ${s.size*3}px ${s.c}`,
            animation:`shimmer 2.5s ease-in-out ${s.d} infinite`,
          }} />
        ))}

        <div style={{
          position:'relative', zIndex:1, display:'flex', flexDirection:'column',
          alignItems:'center', width:'100%', maxWidth:'760px', padding:'0 24px',
        }}>
          <div style={{
            width:'100%', borderRadius:'24px', overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.15)',
            boxShadow:'0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <img src="/pictur.png" alt="Classroom" style={{ width:'100%', display:'block' }} />
          </div>

          <div style={{ marginTop:'18px', textAlign:'center', padding:'0 8px' }}>
            <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.5)', fontStyle:'italic', lineHeight:1.7, margin:0 }}>
              "Empowering students to speak, and teachers to listen."
            </p>
            <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', marginTop:'6px', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              ClassBack · Classroom Feedback &amp; Suggestion System
            </p>
          </div>

          <div style={{ display:'flex', gap:'10px', marginTop:'16px', flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { icon:'📝', label:'Anonymous Feedback' },
              { icon:'⭐', label:'Rate Your Class' },
              { icon:'💡', label:'Submit Suggestions' },
            ].map((f, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:'6px',
                padding:'7px 14px',
                background:'rgba(109,40,217,0.15)',
                border:'1px solid rgba(167,139,250,0.2)',
                borderRadius:'999px',
              }}>
                <span style={{ fontSize:'13px' }}>{f.icon}</span>
                <span style={{ fontSize:'12px', color:'rgba(196,181,253,0.85)', fontWeight:500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Login form card ── */}
      <div style={{
        width:'40%', flexShrink:0,
        display:'flex', flexDirection:'column', justifyContent:'center',
        alignItems:'flex-start', background:'transparent',
        position:'relative', overflow:'hidden', zIndex: 1,
        padding:'40px 44px 0 0',
      }}>
        <div style={{
          width:'100%', maxWidth:'590px', height:'90%',
          background:'rgba(10,4,18,0.65)', backdropFilter:'blur(24px)',
          borderRadius:'24px', border:'1px solid rgba(167,139,250,0.15)',
          padding:'32px 28px', position:'relative', overflow:'hidden',
          display:'flex', flexDirection:'column', justifyContent:'center',
        }}>
          <div style={{
            position:'absolute', top:-80, right:-80, width:280, height:280,
            background:'radial-gradient(circle,rgba(109,40,217,0.3),transparent 70%)',
            borderRadius:'50%', pointerEvents:'none',
          }} />
          <div style={{
            position:'absolute', bottom:-60, left:-60, width:220, height:220,
            background:'radial-gradient(circle,rgba(190,24,93,0.2),transparent 70%)',
            borderRadius:'50%', pointerEvents:'none',
          }} />

          <div style={{ position:'relative', zIndex:1 }}>
            <h2 className="fu1" style={{
              fontFamily:"'Playfair Display', Georgia, serif",
              fontSize:'30px', fontWeight:700, color:'#fff',
              lineHeight:1.2, marginBottom:'6px',
            }}>Welcome back 👋</h2>

            <p className="fu2" style={{ fontSize:'13px', color:'rgba(255,255,255,0.38)', marginBottom:'28px' }}>
              Sign in to your account to continue
            </p>

            {error && (
              <div className="fu1" style={{
                marginBottom:'18px', padding:'11px 14px',
                background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
                borderRadius:'10px', display:'flex', alignItems:'center', gap:'8px',
                fontSize:'13px', color:'#fca5a5',
              }}>
                <AlertCircle size={15} style={{ flexShrink:0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="fu3" style={{ marginBottom:'14px' }}>
                <label style={{
                  display:'block', fontSize:'11px', fontWeight:600,
                  color:'rgba(255,255,255,0.38)', textTransform:'uppercase',
                  letterSpacing:'0.1em', marginBottom:'7px',
                }}>Email Address</label>
                <div className="inp-wrap">
                  <span className="inp-icon"><Mail size={18} /></span>
                  <input type="email" required autoComplete="email"
                    value={email} onChange={e=>setEmail(e.target.value)}
                    className="inp" placeholder="admin@schoolname.edu" />
                </div>
              </div>

              <div className="fu4" style={{ marginBottom:'10px' }}>
                <label style={{
                  display:'block', fontSize:'11px', fontWeight:600,
                  color:'rgba(255,255,255,0.38)', textTransform:'uppercase',
                  letterSpacing:'0.1em', marginBottom:'7px',
                }}>Password</label>
                <div className="inp-wrap">
                  <span className="inp-icon"><Lock size={18} /></span>
                  <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    className="inp-pass" placeholder="••••••••" />
                  <span className="inp-eye" onClick={() => setShowPassword(prev => !prev)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>

              <div className="fu4" style={{ textAlign:'right', marginBottom:'18px' }}>
                <span onClick={() => setShowForgotModal(true)}
                  style={{ fontSize:'12px', color:'#a78bfa', cursor:'pointer', fontWeight:500 }}>
                  Forgot password?
                </span>
              </div>

              <div className="fu5">
                <button type="submit" disabled={loading} className="btn">
                  {loading ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                      <svg style={{ animation:'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;