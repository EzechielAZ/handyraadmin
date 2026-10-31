import React from 'react'
import { Input } from '../../../components/ui/Input'
import { Banknote, Percent, Users, HardHat } from 'lucide-react'
import styles from '../Settings.module.css'

export const CountrySettings = ({ country, onUpdate }) => {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <Banknote size={20} />
        Paramètres par pays - {country.country_name}
      </h2>
      
      <div className={styles.grid}>
        <Input
          label="HPRE min"
          value={country.hpre_min}
          onChange={(e) => onUpdate('hpre_min', e.target.value)}
          type="number"
          min="0"
          step="0.1"
        />
        
        <Input
          label="Prime fixe Bronze"
          value={country.hpre_prime_fixe_bronze}
          onChange={(e) => onUpdate('hpre_prime_fixe_bronze', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Prime fixe Silver"
          value={country.hpre_prime_fixe_silver}
          onChange={(e) => onUpdate('hpre_prime_fixe_silver', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Prime fixe Gold"
          value={country.hpre_prime_fixe_gold}
          onChange={(e) => onUpdate('hpre_prime_fixe_gold', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Prime plafond"
          value={country.hpre_prime_plafond}
          onChange={(e) => onUpdate('hpre_prime_plafond', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Seuil FEF Bronze"
          value={country.hpre_fef_seuil_bronze}
          onChange={(e) => onUpdate('hpre_fef_seuil_bronze', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
      </div>

      <h3 className={styles.subsectionTitle}>Frais agents</h3>
      <div className={styles.grid}>
        <Input
          label="Frais petit chantier"
          value={country.agent_fee_small}
          onChange={(e) => onUpdate('agent_fee_small', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Frais chantier moyen"
          value={country.agent_fee_medium}
          onChange={(e) => onUpdate('agent_fee_medium', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Frais grand chantier"
          value={country.agent_fee_large}
          onChange={(e) => onUpdate('agent_fee_large', e.target.value)}
          type="number"
          min="0"
          prefix="FCFA"
        />
        
        <Input
          label="Part Handyra agents (%)"
          value={country.agent_handyra_share * 100}
          onChange={(e) => onUpdate('agent_handyra_share', e.target.value / 100)}
          type="number"
          min="0"
          max="100"
          suffix="%"
        />
        
        <Input
          label="Taux fonds de garantie (%)"
          value={country.agent_guarantee_fund_rate * 100}
          onChange={(e) => onUpdate('agent_guarantee_fund_rate', e.target.value / 100)}
          type="number"
          min="0"
          max="100"
          suffix="%"
        />
      </div>
    </div>
  )
}