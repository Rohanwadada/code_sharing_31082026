# October 2026 Changes

## Detailed Code Comparison:

### 1. `frontend/src/components/dashboard/RoadmapCard.jsx`

#### Previous Code:
```jsx
          <div className={styles['action-ct']}>
            <button
              className={styles['action-btn']}
              onClick={(e) => onCloneClick(e, cardData)}
              title="clone roadmap"
            >
              <Branch width={16} height={16} />
            </button>
            {['editor', 'owner'].includes(cardData?.access) && (
              <button
                className={styles['action-btn']}
                onClick={(e) => onEditClick(e, cardData)}
                title="edit roadmap"
              >
                <Pencil width={18} height={18} />
              </button>
            )}
```

#### Proposed Changed Code:
```jsx
          <div className={styles['action-ct']}>
            {/* Disable clone button for viewers — only allowed for owner & editor */}
            {['editor', 'owner'].includes(cardData?.access) && (
              <button
                className={styles['action-btn']}
                onClick={(e) => onCloneClick(e, cardData)}
                title="clone roadmap"
              >
                <Branch width={16} height={16} />
              </button>
            )}
            {['editor', 'owner'].includes(cardData?.access) && (
              <button
                className={styles['action-btn']}
                onClick={(e) => onEditClick(e, cardData)}
                title="edit roadmap"
              >
                <Pencil width={18} height={18} />
              </button>
            )}
```

---

### 2. `frontend/src/components/roadmap/RoadmapDataViewer.jsx`

#### Previous Code:
```jsx
            <div className={styles['roadmap-title-ct']}>
              <div className={styles['roadmap-title']}>
                {roadmapTitle}
                {mode === 'live' &&
                  // userDetails?.role === ADMIN_ROLE &&
                  !isMobile && (
                    <button
                      title="edit roadmap"
                      className={styles['edit-roadmap-btn']}
                      onClick={() => handleEditRoadmap(roadmapId)}
                    >
                      <Image
                        src={editIcon}
                        alt="edit-roadmap"
                        ref={downloadRoadmapRef}
                      />
                    </button>
                  )}
              </div>
            </div>
```

#### Proposed Changed Code:
```jsx
            <div className={styles['roadmap-title-ct']}>
              <div className={styles['roadmap-title']}>
                {roadmapTitle}
                {mode === 'live' &&
                  ['owner', 'editor'].includes(roadmapAccessLevel) &&
                  !isMobile && (
                    <button
                      title="edit roadmap"
                      className={styles['edit-roadmap-btn']}
                      onClick={() => handleEditRoadmap(roadmapId)}
                    >
                      <Image
                        src={editIcon}
                        alt="edit-roadmap"
                        ref={downloadRoadmapRef}
                      />
                    </button>
                  )}
              </div>
            </div>
```

---

## Safety Check:
- **Scope**: Only 2 frontend JSX condition wrappers.
- **No breaking changes**: Owners and Editors will continue to see the Clone and Edit buttons normally. Viewers will see only the clean read-only view.
