import type { ReactNode } from 'react'
import styles from './FormCard.module.css'

export function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
