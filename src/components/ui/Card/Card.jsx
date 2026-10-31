import React from 'react'
import styles from './Card.module.css'

const Card = ({
  children,
  padding = 'md',
  className = '',
  as: Tag = 'div',
  ...props
}) => {
  const classes = [styles.card, styles[`pad_${padding}`], className]
    .filter(Boolean)
    .join(' ')

  return <Tag className={classes} {...props}>{children}</Tag>
}

export default Card