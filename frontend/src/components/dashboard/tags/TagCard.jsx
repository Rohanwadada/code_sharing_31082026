import styles from './TagCard.module.css';

const TagCard = ({ icon, text }) => {
  return (
    <div className={styles['tag']}>
      <span className={styles['icon']}>{icon}</span>

      <span className={styles['text']}>{text}</span>
    </div>
  );
};

export default TagCard;
