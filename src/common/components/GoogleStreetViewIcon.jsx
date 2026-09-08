import SvgIcon from '../../resources/images/google-street-view.svg?react';

const GoogleStreetViewIcon = ({ size = 22, style, ...props }) => (
  <SvgIcon
    width={size}
    height={size}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  />
);

export default GoogleStreetViewIcon;
