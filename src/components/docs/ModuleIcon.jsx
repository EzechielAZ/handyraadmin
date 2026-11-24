import { getModuleIcon } from '../../hooks/docs/constants'
import { Icon } from './Icon'

export const ModuleIcon = ({ module, size = 12, strokeWidth = 1.75, className }) => (
  <Icon
    name={getModuleIcon(module)}
    size={size}
    strokeWidth={strokeWidth}
    className={className}
    aria-hidden="true"
  />
)

export default ModuleIcon