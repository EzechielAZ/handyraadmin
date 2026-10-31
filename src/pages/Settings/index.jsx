import React, { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { Spinner } from '../../components/ui/Spinner'
import {
  Save,
  Building2,
  Globe,
  Bell,
  Palette,
  Shield,
  CreditCard,
  Users,
  Percent,
  Mail,
  Phone,
  MapPin,
  FileText,
  Image,
  Link,
  Smartphone,
  Banknote,
  AlertCircle
} from 'lucide-react'
import styles from './Settings.module.css'

const Settings = () => {
  const { settings, isLoading, updateCompanySettings } = useSettingsStore()
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    // Informations générales
    company_name: 'Handyra Technologies',
    legal_form: 'SARL',
    ifu_number: 'IFU123456789',
    rccm_number: 'RCCM-BJ-2024-A-1234',
    tax_id: 'TAX-2024-001',
    
    // Adresse
    address_line1: '15 Rue des Artisans',
    address_line2: 'Zone Industrielle',
    city: 'Cotonou',
    postal_code: '01 BP 1234',
    country: 'Bénin',
    
    // Contact
    phone_primary: '+229 01 23 45 67',
    phone_secondary: '+229 98 76 54 32',
    email_primary: 'contact@handyra.com',
    email_support: 'support@handyra.com',
    email_finance: 'finance@handyra.com',
    website: 'www.handyra.com',
    
    // Bancaire
    bank_name: 'Bank of Africa',
    bank_account_name: 'Handyra Technologies',
    bank_account_number: 'BJ12345678901234567890',
    bank_iban: 'BJ12345678901234567890123456',
    bank_swift: 'BOAOBJBB',
    mobile_money_numbers: {
      moov: '+229 01 23 45 67',
      mtn: '+229 98 76 54 32',
    },
    
    // Commissions et frais
    handyra_commission_rate: 10,
    transaction_fee_fixed: 500,
    transaction_fee_percentage: 0,
    default_tax_rate: 18,
    
    // URLs
    terms_of_service_url: 'https://handyra.com/terms',
    privacy_policy_url: 'https://handyra.com/privacy',
    legal_notice_url: 'https://handyra.com/legal',
    company_logo_url: 'https://handyra.com/logo.png',
    company_stamp_url: 'https://handyra.com/stamp.png',
    legal_signature_url: 'https://handyra.com/signature.png',
    
    // Fonctionnalités
    hpo_enabled: true,
    handyra_agent_enabled: true,
  })

  const tabs = [
    {
      id: 'general',
      label: 'Général',
      icon: Building2,
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: Mail,
    },
    {
      id: 'banking',
      label: 'Bancaire',
      icon: CreditCard,
    },
    {
      id: 'commissions',
      label: 'Commissions',
      icon: Percent,
    },
    {
      id: 'legal',
      label: 'Juridique',
      icon: FileText,
    },
    {
      id: 'appearance',
      label: 'Apparence',
      icon: Palette,
    },
    {
      id: 'features',
      label: 'Fonctionnalités',
      icon: Globe,
    },
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMobileMoneyChange = (provider, value) => {
    setFormData(prev => ({
      ...prev,
      mobile_money_numbers: {
        ...prev.mobile_money_numbers,
        [provider]: value,
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      await updateCompanySettings(formData)
      // toast.success('Paramètres enregistrés')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Paramètres</h1>
          <p className={styles.subtitle}>
            Gérez la configuration de votre plateforme
          </p>
        </div>
        
        <Button
          variant="primary"
          size="md"
          icon={Save}
          onClick={handleSubmit}
          isLoading={isSaving}
          form="settings-form"
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

      <form id="settings-form" onSubmit={handleSubmit} className={styles.form}>
        {/* Général */}
        {activeTab === 'general' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Building2 size={20} />
                Informations générales
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Nom de l'entreprise"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Forme juridique"
                  name="legal_form"
                  value={formData.legal_form}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="Numéro IFU"
                  name="ifu_number"
                  value={formData.ifu_number}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Numéro RCCM"
                  name="rccm_number"
                  value={formData.rccm_number}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Identifiant fiscal"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MapPin size={20} />
                Adresse
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Adresse ligne 1"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Adresse ligne 2"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="Ville"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Code postal"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="Pays"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Phone size={20} />
                Coordonnées
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Téléphone principal"
                  name="phone_primary"
                  value={formData.phone_primary}
                  onChange={handleInputChange}
                  icon={Phone}
                  required
                />
                
                <Input
                  label="Téléphone secondaire"
                  name="phone_secondary"
                  value={formData.phone_secondary}
                  onChange={handleInputChange}
                  icon={Phone}
                />
                
                <Input
                  label="Email principal"
                  name="email_primary"
                  type="email"
                  value={formData.email_primary}
                  onChange={handleInputChange}
                  icon={Mail}
                  required
                />
                
                <Input
                  label="Email support"
                  name="email_support"
                  type="email"
                  value={formData.email_support}
                  onChange={handleInputChange}
                  icon={Mail}
                />
                
                <Input
                  label="Email finance"
                  name="email_finance"
                  type="email"
                  value={formData.email_finance}
                  onChange={handleInputChange}
                  icon={Mail}
                />
                
                <Input
                  label="Site web"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  icon={Globe}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bancaire */}
        {activeTab === 'banking' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <CreditCard size={20} />
                Informations bancaires
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Nom de la banque"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="Nom du compte"
                  name="bank_account_name"
                  value={formData.bank_account_name}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="Numéro de compte"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="IBAN"
                  name="bank_iban"
                  value={formData.bank_iban}
                  onChange={handleInputChange}
                />
                
                <Input
                  label="Code SWIFT/BIC"
                  name="bank_swift"
                  value={formData.bank_swift}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Smartphone size={20} />
                Mobile Money
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Moov"
                  value={formData.mobile_money_numbers.moov}
                  onChange={(e) => handleMobileMoneyChange('moov', e.target.value)}
                  icon={Smartphone}
                />
                
                <Input
                  label="MTN"
                  value={formData.mobile_money_numbers.mtn}
                  onChange={(e) => handleMobileMoneyChange('mtn', e.target.value)}
                  icon={Smartphone}
                />
              </div>
            </div>
          </div>
        )}

        {/* Commissions */}
        {activeTab === 'commissions' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Percent size={20} />
                Taux et frais
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="Commission Handyra (%)"
                  name="handyra_commission_rate"
                  type="number"
                  value={formData.handyra_commission_rate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  suffix="%"
                />
                
                <Input
                  label="Frais fixe par transaction"
                  name="transaction_fee_fixed"
                  type="number"
                  value={formData.transaction_fee_fixed}
                  onChange={handleInputChange}
                  min="0"
                  prefix="FCFA"
                />
                
                <Input
                  label="Frais variable (%)"
                  name="transaction_fee_percentage"
                  type="number"
                  value={formData.transaction_fee_percentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  suffix="%"
                />
                
                <Input
                  label="Taux de TVA par défaut"
                  name="default_tax_rate"
                  type="number"
                  value={formData.default_tax_rate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  suffix="%"
                />
              </div>
            </div>

            <div className={styles.infoBox}>
              <AlertCircle size={20} />
              <div>
                <strong>Note sur les commissions</strong>
                <p>
                  La commission Handyra est prélevée sur le montant total de chaque mission.
                  Les frais de transaction s'appliquent en plus pour les paiements par mobile money ou carte.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Juridique */}
        {activeTab === 'legal' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Link size={20} />
                Documents légaux
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="URL Conditions d'utilisation"
                  name="terms_of_service_url"
                  value={formData.terms_of_service_url}
                  onChange={handleInputChange}
                  icon={Link}
                />
                
                <Input
                  label="URL Politique de confidentialité"
                  name="privacy_policy_url"
                  value={formData.privacy_policy_url}
                  onChange={handleInputChange}
                  icon={Link}
                />
                
                <Input
                  label="URL Mentions légales"
                  name="legal_notice_url"
                  value={formData.legal_notice_url}
                  onChange={handleInputChange}
                  icon={Link}
                />
              </div>
            </div>
          </div>
        )}

        {/* Apparence */}
        {activeTab === 'appearance' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Image size={20} />
                Images et médias
              </h2>
              
              <div className={styles.grid}>
                <Input
                  label="URL du logo"
                  name="company_logo_url"
                  value={formData.company_logo_url}
                  onChange={handleInputChange}
                  icon={Image}
                />
                
                <Input
                  label="URL du cachet"
                  name="company_stamp_url"
                  value={formData.company_stamp_url}
                  onChange={handleInputChange}
                  icon={Image}
                />
                
                <Input
                  label="URL de la signature"
                  name="legal_signature_url"
                  value={formData.legal_signature_url}
                  onChange={handleInputChange}
                  icon={Image}
                />
              </div>
            </div>

            {formData.company_logo_url && (
              <div className={styles.preview}>
                <img src={formData.company_logo_url} alt="Logo preview" />
              </div>
            )}
          </div>
        )}

        {/* Fonctionnalités */}
        {activeTab === 'features' && (
          <div className={styles.tabContent}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Globe size={20} />
                Activation des fonctionnalités
              </h2>
              
              <div className={styles.featuresList}>
                <label className={styles.featureItem}>
                  <input
                    type="checkbox"
                    name="hpo_enabled"
                    checked={formData.hpo_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, hpo_enabled: e.target.checked }))}
                  />
                  <div>
                    <strong>HPO (Handyra Project Oversight)</strong>
                    <p>Supervision de chantiers par des superviseurs certifiés</p>
                  </div>
                </label>

                <label className={styles.featureItem}>
                  <input
                    type="checkbox"
                    name="handyra_agent_enabled"
                    checked={formData.handyra_agent_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, handyra_agent_enabled: e.target.checked }))}
                  />
                  <div>
                    <strong>Agents Handyra</strong>
                    <p>Agents de terrain pour les missions complexes</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default Settings