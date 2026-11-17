import hills from '../assets/icons/cover-hills.svg'
import sun from '../assets/icons/cover-sun.svg'

// The job's cover image, or the Figma placeholder art (dark sky, green hills, a moon) when there is none
export function JobCover({ src, className = '', children }) {
  return (
    <div className={`job-cover ${className}`}>
      {src ? (
        <img className="job-cover__photo" src={src} alt="" />
      ) : (
        <>
          <img className="job-cover__hills" src={hills} alt="" />
          <img className="job-cover__sun" src={sun} alt="" />
        </>
      )}
      {children}
    </div>
  )
}
