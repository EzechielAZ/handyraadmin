import React from 'react'
import styles from './Spinner.module.css'

const Spinner = ({ size = 'md', className = '' }) => (
  <span className={[styles.spinner, styles[size], className].filter(Boolean).join(' ')} />
)

export default Spinner