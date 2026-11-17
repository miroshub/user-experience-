import './Button.css'

// Figma "Button": Primary for the main action (one per view), Secondary for the alternative, Ghost for links
export function Button({ variant = 'primary', size = 'md', fullWidth = false, type = 'button', className, children, ...rest }) {
  const classes = ['button', `button--${variant}`, `button--${size}`]
  if (fullWidth) classes.push('button--full')
  if (className) classes.push(className)
  return (
    <button type={type} className={classes.join(' ')} {...rest}>
      {children}
    </button>
  )
}
