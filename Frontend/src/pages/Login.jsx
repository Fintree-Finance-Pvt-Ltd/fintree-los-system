import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { loginWithToken, user } = useAuth();
  const navigate = useNavigate();

  const requestOtp = async () => {
    setBusy(true);
    try {
      const normalized = email.trim().toLowerCase();
      await api.post('/auth/request-otp', { email: normalized });
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        code: code.trim(), // keep as string (leading zeros matter)
      };
      const { data } = await api.post('/auth/verify-otp', payload);
      await loginWithToken(data.token);      // saves token + loads /auth/me
      navigate('/', { replace: true });      // ✅ go to dashboard
    } catch (e) {
      alert(e?.response?.data?.error || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  // If already logged in, bounce off the login page
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <Box sx={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', p:2 }}>
      <Paper sx={{ p:3, width: 360 }}>
        <Typography variant="h6" sx={{ mb:2 }}>Email OTP Login</Typography>

        {step === 1 ? (
          <>
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              sx={{ mb:2 }}
            />
            <Button fullWidth variant="contained" onClick={requestOtp} disabled={busy || !email}>
              {busy ? 'Sending...' : 'Send OTP'}
            </Button>
          </>
        ) : (
          <>
            <TextField
              fullWidth
              label="Enter OTP"
              value={code}
              onChange={(e)=>setCode(e.target.value)}
              sx={{ mb:2 }}
              // keep type text to preserve leading zeros; hint numeric keypad on mobile
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            />
            <Button fullWidth variant="contained" onClick={verifyOtp} disabled={busy || !code}>
              {busy ? 'Verifying...' : 'Verify'}
            </Button>
            <Typography color="text.secondary" sx={{ mt:1 }}>
              Check your server console for the OTP if SMTP isn’t set.
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
