import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';

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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (pw) => ({
    hasUpper:   /[A-Z]/.test(pw),
    hasLower:   /[a-z]/.test(pw),
    hasNumber:  /\d/.test(pw),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    isLong:     pw.length >= 8,
  });
  const pwStrength = validatePassword(newPassword);

  const startCanvasAnimation = (canvas) => {
    if (!canvas) return () => {};
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
      x -= 3; y -= 2;
      if (x < -w * 2) x = 0;
      if (y < -h * 2) y = 0;
      ctx.fillStyle = '#1a0008';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(x, y);
      const grd = ctx.createLinearGradient(0, h * 4, w * 4, 0);
      grd.addColorStop(0,    '#1a0008');
      grd.addColorStop(0.15, '#3d0015');
      grd.addColorStop(0.3,  '#7b0f3a');
      grd.addColorStop(0.45, '#220748');
      grd.addColorStop(0.6,  '#2a011a');
      grd.addColorStop(0.75, '#260255');
      grd.addColorStop(0.88, '#3d0015');
      grd.addColorStop(1,    '#1a0008');
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
  };

  useEffect(() => {
    const cleanup = startCanvasAnimation(canvasRef.current);
    return cleanup;
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
    try {
      await authAPI.forgotPassword(forgotEmail.toLowerCase().trim());
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyCode = async () => {
    if (!forgotCode) { setForgotError('Please enter the code.'); return; }
    setForgotError('');
    setForgotLoading(true);
    try {
      await authAPI.verifyResetCode(forgotEmail.toLowerCase().trim(), forgotCode.trim());
      setForgotStep(3);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (!newPassword || !confirmPassword) { setForgotError('Please fill in all fields.'); return; }
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setForgotError('Password must be at least 6 characters.'); return; }
    setForgotError('');
    setForgotLoading(true);
    try {
      await authAPI.resetPassword(forgotEmail.toLowerCase().trim(), forgotCode.trim(), newPassword);
      closeForgotModal();
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotCode('');
    setForgotError('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const sharedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shimmer{ 0%,100%{opacity:0.4} 50%{opacity:1} }
    @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes modalIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes floatImg { 
  0%,100%{transform:translateY(0px)} 
  50%{transform:translateY(-16px)} 
}

    .fu1{animation:fadeUp 0.6s ease 0.0s both}
    .fu2{animation:fadeUp 0.6s ease 0.1s both}
    .fu3{animation:fadeUp 0.6s ease 0.2s both}
    .fu4{animation:fadeUp 0.6s ease 0.3s both}
    .fu5{animation:fadeUp 0.6s ease 0.4s both}

    .inp-wrap { position: relative; display: flex; align-items: center; }
    .inp-icon {
      position: absolute; left: 13px; z-index: 2;
      color: rgba(255,255,255,0.7);
      pointer-events: none;
      display: flex; align-items: center;
    }
    .inp-eye {
      position: absolute; right: 13px;
      color: #a78bfa;
      cursor: pointer;
      display: flex; align-items: center;
      transition: color 0.2s;
    }
    .inp-eye:hover { color: rgba(167,139,250,1); }

    .inp {
      width:100%; padding:13px 16px 13px 40px;
      background:#0d0718;
      border:1px solid rgba(167,139,250,0.15);
      border-radius:10px; color:#fff;
      font-size:14px; font-family:'DM Sans',sans-serif;
      outline:none; transition:all 0.25s;
    }
    .inp:focus {
      background:#0d0718;
      border-color:rgba(167,139,250,0.6);
      box-shadow:0 0 0 3px rgba(109,40,217,0.2);
    }
    .inp::placeholder { color:rgba(255,255,255,0.28) }
    .inp:-webkit-autofill,
    .inp:-webkit-autofill:hover,
    .inp:-webkit-autofill:focus,
    .inp:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 1000px #0d0718 inset !important;
      -webkit-text-fill-color: #fff !important;
      caret-color: #fff !important;
      border-color: rgba(167,139,250,0.15) !important;
      transition: background-color 9999s ease-in-out 0s;
    }

    .inp-pass {
      width:100%; padding:13px 42px 13px 40px;
      background:#0d0718;
      border:1px solid rgba(167,139,250,0.15);
      border-radius:10px; color:#fff;
      font-size:14px; font-family:'DM Sans',sans-serif;
      outline:none; transition:all 0.25s;
    }
    .inp-pass:focus {
      background:#0d0718;
      border-color:rgba(167,139,250,0.6);
      box-shadow:0 0 0 3px rgba(109,40,217,0.2);
    }
    .inp-pass::placeholder { color:rgba(255,255,255,0.28) }
    .inp-pass:-webkit-autofill,
    .inp-pass:-webkit-autofill:hover,
    .inp-pass:-webkit-autofill:focus,
    .inp-pass:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 1000px #0d0718 inset !important;
      -webkit-text-fill-color: #fff !important;
      caret-color: #fff !important;
      border-color: rgba(167,139,250,0.15) !important;
      transition: background-color 9999s ease-in-out 0s;
    }

    .inp-light {
      width:100%; padding:13px 16px;
      background:#050208 !important;
      border:1px solid rgba(167,139,250,0.2);
      border-radius:10px; color:#fff !important;
      font-size:14px; font-family:'DM Sans',sans-serif;
      outline:none; transition:border 0.25s, box-shadow 0.25s;
    }
    .inp-light:focus {
      background:#050208 !important;
      border-color:rgba(167,139,250,0.6);
      box-shadow:0 0 0 3px rgba(109,40,217,0.15);
    }
    .inp-light::placeholder { color:rgba(255,255,255,0.28) }
    .inp-light:-webkit-autofill,
    .inp-light:-webkit-autofill:hover,
    .inp-light:-webkit-autofill:focus,
    .inp-light:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 9999px #050208 inset !important;
      box-shadow: 0 0 0px 9999px #050208 inset !important;
      -webkit-text-fill-color: #fff !important;
      color: #fff !important;
      caret-color: #fff !important;
      background-color: #050208 !important;
    }

    .inp-light-icon {
      width:100%; padding:13px 42px 13px 40px;
      background:#050208 !important;
      border:1px solid rgba(167,139,250,0.2);
      border-radius:10px; color:#fff !important;
      font-size:14px; font-family:'DM Sans',sans-serif;
      outline:none; transition:border 0.25s, box-shadow 0.25s;
    }
    .inp-light-icon:focus {
      background:#050208 !important;
      border-color:rgba(167,139,250,0.6);
      box-shadow:0 0 0 3px rgba(109,40,217,0.15);
    }
    .inp-light-icon::placeholder { color:rgba(255,255,255,0.28) }
    .inp-light-icon:-webkit-autofill,
    .inp-light-icon:-webkit-autofill:hover,
    .inp-light-icon:-webkit-autofill:focus,
    .inp-light-icon:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 9999px #050208 inset !important;
      box-shadow: 0 0 0px 9999px #050208 inset !important;
      -webkit-text-fill-color: #fff !important;
      color: #fff !important;
      caret-color: #fff !important;
      background-color: #050208 !important;
    }

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

    .deco-img-wrap {
      position: absolute;
      bottom: 80px;
      left: 60px;
      right: 0;
      width: 100%;
      max-width: 100%;
      pointer-events: none;
      z-index: 0;
    }
    .deco-img-wrap img {
      width: 95%;
      height: auto;
      display: block;
      object-fit: cover;
      object-position: top center;
      animation: floatImg 5s ease-in-out infinite;
      mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,1) 55%, transparent 100%);
      -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,1) 55%, transparent 100%);
      filter: saturate(1.4) brightness(1.05);
      mix-blend-mode: normal;
      opacity: 1;
    }

    .deco-img-glow {
      position: absolute;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      height: 200px;
      background: radial-gradient(ellipse, rgba(53, 2, 47, 0.7) 0%, rgba(109, 40, 217, 0.2) 50%, transparent 80%);
      pointer-events: none;
      z-index: 0;
    }

    /* Hide scrollbar for all browsers */
    body {
      overflow: hidden;
    }
    
    ::-webkit-scrollbar {
      display: none;
    }
  `;

  return (
    <div style={{
      height:'100vh', width:'100vw', overflow:'hidden',
      display:'flex', background:'#1a0008',
      fontFamily:"'DM Sans', sans-serif",
      position:'relative',
    }}>
      <canvas ref={canvasRef} style={{
        position:'absolute', inset:0,
        width:'100%', height:'100%', zIndex:0,
      }} />

      <style>{sharedStyles}</style>

      {/* School Logo in Upper Right Corner */}
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '40px',
        zIndex: 20,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}>
        <img
          src="/tmc.jpg"
          alt="School Logo"
          style={{
            width: '55px',
            height: '55px',
            objectFit: 'cover',
            borderRadius: '50%',
            border: '2px solid rgba(139, 92, 246, 0.6)',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
            background: 'rgba(20, 5, 40, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
        />
      </div>

      {/* Forgot Password Modal */}
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
                <div className="inp-wrap" style={{ marginBottom:20 }}>
                  <span style={{ position:'absolute', left:13, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', pointerEvents:'none' }}>
                    <Mail size={16} />
                  </span>
                  <input className="inp-light-icon" type="email" placeholder="Enter your email" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleForgotSendCode()} />
                </div>
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
                <div className="inp-wrap" style={{ marginBottom: newPassword.length > 0 ? 10 : 14 }}>
                  <span style={{ position:'absolute', left:13, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', pointerEvents:'none' }}>
                    <Lock size={16} />
                  </span>
                  <input className="inp-light-icon" type={showNewPassword ? 'text' : 'password'} placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <span className="inp-eye" onClick={() => setShowNewPassword(p => !p)}>
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </div>
                {newPassword.length > 0 && (
                  <div style={{ marginBottom:14, padding:'10px 12px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, marginBottom:6 }}>Password strength:</p>
                    <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                      {[pwStrength.isLong, pwStrength.hasUpper, pwStrength.hasLower, pwStrength.hasNumber, pwStrength.hasSpecial].map((met, i) => (
                        <div key={i} style={{ flex:1, height:4, borderRadius:2, backgroundColor: met ? '#22c55e' : 'rgba(255,255,255,0.1)', transition:'background 0.3s' }} />
                      ))}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 10px' }}>
                      {[
                        { label:'8+ chars', met: pwStrength.isLong },
                        { label:'Uppercase', met: pwStrength.hasUpper },
                        { label:'Lowercase', met: pwStrength.hasLower },
                        { label:'Number', met: pwStrength.hasNumber },
                        { label:'Symbol', met: pwStrength.hasSpecial },
                      ].map((h, i) => (
                        <span key={i} style={{ fontSize:11, color: h.met ? '#22c55e' : 'rgba(255,255,255,0.3)', transition:'color 0.3s' }}>
                          {h.met ? '✓' : '✗'} {h.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:7 }}>Confirm Password</label>
                <div className="inp-wrap" style={{ marginBottom:20 }}>
                  <span style={{ position:'absolute', left:13, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', pointerEvents:'none' }}>
                    <Lock size={16} />
                  </span>
                  <input className="inp-light-icon" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <span className="inp-eye" onClick={() => setShowConfirmPassword(p => !p)}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </div>
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
        width:'50%', position:'relative', overflow:'visible',
        display:'flex', flexDirection:'column',
        justifyContent:'flex-start',
        zIndex:2, padding:'28px 48px 56px 60px',
      }}>
        <div className="deco-img-glow" />
        <div className="deco-img-wrap">
          <img src="/pictyur.png" alt="" aria-hidden="true" />
        </div>

        <h2 className="fu1" style={{
          fontFamily:"'Playfair Display', Georgia, serif",
          fontSize:'clamp(26px, 3vw, 42px)',
          fontWeight:900, color:'#fff', lineHeight:1.15,
          marginBottom:'14px',
          position:'relative', zIndex:2,
          whiteSpace:'nowrap',
        }}>
          Welcome Back to Your <span style={{ background:'linear-gradient(135deg,#a78bfa,#f472b6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Feedback Dashboard</span>
        </h2>

        <p className="fu2" style={{
          fontSize:'15px', color:'rgba(255,255,255,0.45)',
          lineHeight:1.7, marginBottom:0,
          position:'relative', zIndex:2,
          whiteSpace:'nowrap',
        }}>
          Manage student feedback, track engagement, and build a better classroom environment through data-driven insights.
        </p>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div style={{
        width:'50%', flexShrink:0,
        display:'flex', flexDirection:'column', justifyContent:'center',
        alignItems:'center',
        position:'relative', zIndex:1,
        padding:'100px 80px 40px 32px',
      }}>
        <div style={{
          width:'100%', maxWidth:'630px',
          height: '490px',
          background:'rgba(10,4,18,0.75)',
          marginLeft:'32px',
          backdropFilter:'blur(24px)',
          borderRadius:'24px',
          border:'1px solid rgba(167,139,250,0.15)',
          padding:'15px 26px',
          boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
          animation:'fadeUp 0.5s ease 0.1s both',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', top:-60, right:-60, width:200, height:200,
            background:'radial-gradient(circle,rgba(109,40,217,0.25),transparent 70%)',
            borderRadius:'50%', pointerEvents:'none',
          }} />
          <div style={{
            position:'absolute', bottom:-50, left:-50, width:180, height:180,
            background:'radial-gradient(circle,rgba(190,24,93,0.18),transparent 70%)',
            borderRadius:'50%', pointerEvents:'none',
          }} />

          {/* ✅ Logo added here inside the card */}
         
<div style={{ position:'relative', zIndex:1, marginBottom:'20px', display:'flex', justifyContent:'center' }}>
  <img
    src="/las.png"
    alt="Logo"
    style={{
      width:'72px',
      height:'72px',
      objectFit:'cover',
      borderRadius:'50%',
      border:'2px solid rgba(167,139,250,0.4)',
    }}
  />
</div>

          {/* Header */}
        <div style={{ position:'relative', zIndex:1, marginBottom:'28px', textAlign:'center' }}>
  <h2 style={{
    fontFamily:"'Playfair Display', Georgia, serif",
    fontSize:'26px', fontWeight:900, lineHeight:1.2, margin:'0 0 6px 0',
    background:'linear-gradient(135deg,#a78bfa,#f472b6)',
    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
  }}>ClassBack</h2>
  <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.38)', margin:0 }}>
    Enter your credentials to access your account
  </p>
</div>

          {error && (
            <div style={{
              position:'relative', zIndex:1,
              marginBottom:'18px', padding:'11px 14px',
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:'10px', display:'flex', alignItems:'center', gap:'8px',
              fontSize:'13px', color:'#fca5a5',
            }}>
              <AlertCircle size={15} style={{ flexShrink:0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ position:'relative', zIndex:1 }}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:'11px', fontWeight:700,
                color:'rgba(255,255,255,0.38)', textTransform:'uppercase',
                letterSpacing:'0.1em', marginBottom:'8px',
              }}>
                Email Address
              </label>
              <div className="inp-wrap">
                <span className="inp-icon" style={{ color:'rgba(255,255,255,0.7)' }}><Mail size={17} /></span>
                <input type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="inp" placeholder="admin@school.edu" />
              </div>
            </div>

            <div style={{ marginBottom:'10px' }}>
              <label style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:'11px', fontWeight:700,
                color:'rgba(255,255,255,0.38)', textTransform:'uppercase',
                letterSpacing:'0.1em', marginBottom:'8px',
              }}>
                Password
              </label>
              <div className="inp-wrap">
                <span className="inp-icon" style={{ color:'rgba(255,255,255,0.7)' }}><Lock size={17} /></span>
                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="inp-pass" placeholder="••••••••" />
                <span className="inp-eye" onClick={() => setShowPassword(prev => !prev)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </span>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'22px' }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" style={{ accentColor:'#7c3aed', width:15, height:15 }} />
                <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>Remember me</span>
              </label>
              <span onClick={() => setShowForgotModal(true)}
                style={{ fontSize:'13px', color:'#a78bfa', cursor:'pointer', fontWeight:600 }}>
                Forgot password?
              </span>
            </div>

            <button type="submit" disabled={loading} className="btn">
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  <svg style={{ animation:'spin 1s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>Sign In to Dashboard 🛡</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Three buttons placed horizontally in the middle between left picture and login form - adjusted lower, dark violet/blacklight style, and more faint */}
      <div style={{
        position: 'absolute',
        left: '25%',
        top: 'calc(50% + 320px)',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <button
          onClick={() => {
            console.log('Anonymous Feedback clicked');
          }}
          style={{
            padding: '12px 24px',
            background: 'rgba(20, 5, 40, 0.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '40px',
            color: '#c4b5fd',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.background = 'rgba(30, 10, 60, 0.7)';
            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.5)';
            e.currentTarget.style.color = '#e9d5ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.1)';
            e.currentTarget.style.background = 'rgba(20, 5, 40, 0.55)';
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.color = '#c4b5fd';
          }}
        >
          📝 Anonymous Feedback
        </button>
        <button
          onClick={() => {
            console.log('Manage Students clicked');
          }}
          style={{
            padding: '12px 24px',
            background: 'rgba(20, 5, 40, 0.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '40px',
            color: '#c4b5fd',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.background = 'rgba(30, 10, 60, 0.7)';
            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.5)';
            e.currentTarget.style.color = '#e9d5ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.1)';
            e.currentTarget.style.background = 'rgba(20, 5, 40, 0.55)';
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.color = '#c4b5fd';
          }}
        >
          👥 Manage Students
        </button>
        <button
          onClick={() => {
            console.log('Help the School clicked');
          }}
          style={{
            padding: '12px 24px',
            background: 'rgba(20, 5, 40, 0.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '40px',
            color: '#c4b5fd',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.background = 'rgba(30, 10, 60, 0.7)';
            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.5)';
            e.currentTarget.style.color = '#e9d5ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.1)';
            e.currentTarget.style.background = 'rgba(20, 5, 40, 0.55)';
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            e.currentTarget.style.color = '#c4b5fd';
          }}
        >
          🏫 Help the School
        </button>
      </div>
    </div>
  );
};

export default Login;