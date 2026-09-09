import styles from './RoadmapTabs.module.css';

const RoadmapTabs = ({ tabs, currentTab = 'all', onTabChnage }) => {
  return (
    <div className={styles['main-ct']}>
      {tabs.map((tab, idx) => (
        <div
          key={idx}
          onClick={() => onTabChnage(tab)}
          className={`${styles['tab']} ${currentTab === tab.id ? styles['active'] : ''}`}
        >
          {tab.name}
          <span> ({tab.count})</span>
        </div>
      ))}
    </div>
  );
};

export default RoadmapTabs;
