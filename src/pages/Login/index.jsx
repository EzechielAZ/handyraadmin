import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import styles from './Login.module.css'

const Login = () => {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'L\'email est requis'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide'
    }
    
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      navigate('/dashboard')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.overlay}>
          <div className={styles.brand}>
            <img src="/logo-white.svg" alt="Handyra" className={styles.logo} />
            <h1>Handyra Admin</h1>
          </div>
          <div className={styles.quote}>
            <blockquote>
              "La plateforme qui connecte les meilleurs artisans avec leurs clients"
            </blockquote>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>5000+</span>
                <span className={styles.statLabel}>Artisans</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>10000+</span>
                <span className={styles.statLabel}>Missions</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>4.8</span>
                <span className={styles.statLabel}>Note moyenne</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <h2>Connexion</h2>
            <p>Accédez à votre espace d'administration</p>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="admin@handyra.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              required
              fullWidth
              size="lg"
            />
            
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              label="Mot de passe"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={Lock}
              required
              fullWidth
              size="lg"
            />
            
            <div className={styles.options}>
              <label className={styles.remember}>
                <input type="checkbox" /> 
                <span>Se souvenir de moi</span>
              </label>
              <button type="button" className={styles.forgotPassword}>
                Mot de passe oublié ?
              </button>
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              icon={LogIn}
            >
              Se connecter
            </Button>
          </form>
          
          <div className={styles.footer}>
            <p>© 2024 Handyra. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login