import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Tabs from '../../components/ui/Tabs'
import { ArrowLeft, Save, Store, MapPin, Phone, Mail, FileText, Image } from 'lucide-react'
import styles from './Hardware.module.css'

const NewHardware = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('info')
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    // Informations générales
    name: '',
    owner_name: '',
    ifu_number: '',
    access_code: '',
    
    // Contact
    phone: '',
    email: '',
    
    // Adresse
    address: '',
    city: '',
    country: 'Bénin',
    latitude: '',
    longitude: '',
    
    // Autres
    is_active: true,
  })

  const tabs = [
    {
      id: 'info',
      label: 'Informations',
      icon: Store,
    },
    {
      id: 'address',
      label: 'Adresse',
      icon: MapPin,
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: Phone,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
    },
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      // Logique de création (à connecter avec Supabase)
      console.log('Création quincaillerie:', formData)
      
      // Simuler un délai
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Rediriger vers la liste
      navigate('/hardware')
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/hardware')}
          >
            Retour
          </Button>
          
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Nouvelle quincaillerie</h1>
            <p className={styles.subtitle}>
              Ajoutez une nouvelle quincaillerie partenaire
            </p>
          </div>
        </div>
        
        <Button
          variant="primary"
          size="md"
          icon={Save}
          onClick={handleSubmit}
          isLoading={isSaving}
          form="hardware-form"
        >
          Enregistrer
        </Button>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className={styles.tabs}
      />

      <form id="hardware-form" onSubmit={handleSubmit} className={styles.form}>
        {activeTab === 'info' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Store size={20} />
                Informations générales
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Nom de la quincaillerie *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Nom du gérant *"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Numéro IFU *"
                  name="ifu_number"
                  value={formData.ifu_number}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Code d'accès *"
                  name="access_code"
                  value={formData.access_code}
                  onChange={handleInputChange}
                  hint="Code unique pour la quincaillerie"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'address' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MapPin size={20} />
                Adresse
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Adresse *"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Ville *"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Pays"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  disabled
                />
                
                <Input
                  label="Latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  hint="Optionnel"
                />
                
                <Input
                  label="Longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  hint="Optionnel"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Phone size={20} />
                Coordonnées
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Téléphone *"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  icon={Phone}
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  icon={Mail}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Image size={20} />
                Documents
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="URL du logo"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleInputChange}
                  icon={Image}
                  hint="Optionnel"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default NewHardware