import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './ContentTab.module.css';
import resourceTitleIcon from '@/assets/resource-title-icon.svg';
import resourceLinkIcon from '@/assets/resource-link-icon.svg';
import resourceDeleteIcon from '@/assets/resource-delete-icon.svg';
import downloadIcon from '@/assets/node-content-viewer/download.svg';
import notDownloadIcon from '@/assets/node-content-viewer/not-download.svg';
import PropTypes from 'prop-types';
import { getTimestampInKolkata } from '@/utils/constants';
import addToBagIcon from '@/assets/add-to-bag-icon.svg';
import removeFromBagIcon from '@/assets/remove-from-bag-icon.svg';
import { Tooltip } from 'react-tooltip';
import { useAuthStore } from '@/store/authStore';
import { RoadmapContext } from '@/context/RoadmapContext';
import Image from 'next/image';
import {
  getNodeContent as getNodeContentApi,
  updateNodeContent,
} from '@/service/roadmapContent.service';

function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * ContentTab Component
 *
 * Manages and displays the title, description, and links for a selected node.
 * Fetches content from the server and updates it with debounced API calls.
 *
 * Props:
 * @param {Object} selectedNode : The currently selected node.
 * @param {String} roadmapId : ID of the roadmap.
 * @param {Function} hasPermission : Function to check if the user has permission for specific properties.
 *
 * Functions:
 * - getNodeContent(): Fetches node content from the server.
 * - saveUpdatedNodeContent(): Saves updates via API.
 * - debouncedSaveNodeContent(): Optimizes content updates.
 *
 * Renders:
 * - Title, description, and links editors (based on permissions).
 */
const ContentTab = ({ selectedNode, roadmapId, hasPermission }) => {
  const userDetails = useAuthStore((s) => s.userDetails);
  const [nodeContent, setNodeContent] = useState({
    title: '',
    description: '',
    links: [],
  });

  const isFirstRender = useRef(true);
  const getNodeContent = async () => {
    try {
      if (selectedNode) {
        const responseData = await getNodeContentApi(
          roadmapId,
          selectedNode?.id,
        );
        setNodeContent({
          description: responseData?.content?.description || '',
          links: responseData?.content?.links || [],
          title: responseData?.content?.title || '',
          updated_at: getTimestampInKolkata(),
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const saveUpdatedNodeContent = async (content) => {
    try {
      const responseData = await updateNodeContent(
        roadmapId,
        selectedNode.id,
        content,
      );
    } catch (error) {
      console.log(error);
    }
  };

  const debouncedSaveNodeContent = useCallback(
    debounce((content) => {
      saveUpdatedNodeContent(content);
    }, 500),
    [selectedNode?.id],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (selectedNode) {
      debouncedSaveNodeContent(nodeContent);
    }
  }, [
    nodeContent,
    // selectedNode?.id,
    // selectedNode?.data,
    debouncedSaveNodeContent,
  ]);

  useEffect(() => {
    getNodeContent();
  }, [selectedNode?.id]);

  return (
    <div className={styles['content-container']}>
      {/* Title editor */}
      {hasPermission('contentAndLinks', 'titleEditor') && (
        <ContentTitleEditor
          nodeContent={nodeContent}
          setNodeContent={setNodeContent}
        />
      )}

      {/* Desctiption editor */}
      {hasPermission('contentAndLinks', 'descriptionEditor') && (
        <ContentDescriptionEditor
          nodeContent={nodeContent}
          setNodeContent={setNodeContent}
        />
      )}

      {/* Links editor */}
      {hasPermission('contentAndLinks', 'linksEditor') && (
        <ContentLinksEditor
          selectedNode={selectedNode}
          nodeContent={nodeContent}
          setNodeContent={setNodeContent}
          roadmapId={roadmapId}
        />
      )}

      {/* Add to push email, depenedent upon link content addition */}
      {hasPermission('contentAndLinks', 'linksEditor') && (
        <AddToContentUpdateMailer
          nodeContent={nodeContent}
          selectedNode={selectedNode}
          roadmapId={roadmapId}
        />
      )}
    </div>
  );
};

/**
 * ContentTitleEditor Component
 *
 * Handles editing the title of a node.
 *
 * Props:
 * @param {Object} nodeContent: Object containing node content.
 * @param {Function} setNodeContent: Function to update node content.
 *
 * Functions:
 * - handleNodeTitleChange(): Updates the title in state.
 *
 * Renders:
 * - Input field for editing the node title.
 */
const ContentTitleEditor = ({ nodeContent, setNodeContent }) => {
  const handleNodeTitleChange = (e) => {
    setNodeContent({ ...nodeContent, title: e.target.value });
  };

  return (
    <div className={styles['label-container']}>
      <p className={styles['label-name']}>TITLE</p>
      <input
        type="text"
        value={nodeContent?.title || ''}
        placeholder="Title"
        onChange={handleNodeTitleChange}
        className={styles['label-input']}
      />
    </div>
  );
};

/**
 * ContentDescriptionEditor Component
 *
 * Handles editing the description of a node.
 *
 * Props:
 * @param {Object} nodeContent: Object containing node content.
 * @param {Function} setNodeContent: Function to update node content.
 *
 * Functions:
 * - handleDescriptionChange(): Updates the description in state.
 *
 * Renders:
 * - Textarea for editing the node description.
 */
const ContentDescriptionEditor = ({ nodeContent, setNodeContent }) => {
  const handleDescriptionChange = (e) => {
    setNodeContent({ ...nodeContent, description: e.target.value });
  };
  return (
    <div className={styles['description']}>
      <p className={styles['label-name']}>DESCRIPITION</p>
      <textarea
        placeholder="Description"
        value={nodeContent?.description}
        onChange={handleDescriptionChange}
        className={styles['description-textarea']}
      ></textarea>
    </div>
  );
};

/**
 * ContentLinksEditor Component
 *
 * Handles adding, updating, and removing resource links for a node.
 *
 * Props:
 * @param {Object} selectedNode: Currently selected node.
 * @param {Object} nodeContent: Object containing node content.
 * @param {Function} setNodeContent: Function to update node content.
 *
 * Renders:
 * - Input fields for title and URL.
 * - Dropdown for selecting link type.
 * - Access type toggle (Public/Premium).
 * - Buttons to add and remove links.
 *
 * @component
 * @returns {JSX.Element} The link editor UI.
 */
const ContentLinksEditor = ({
  selectedNode,
  nodeContent,
  setNodeContent,
  roadmapId,
}) => {
  const { contentUpdatedNodeDetails, setContentUpdateNodeDetails } =
    useContext(RoadmapContext);

  /**
   *
   * @param {Event} e Link type change event
   * @param {String} linkId Id of the link
   */
  const handleLinkChange = (e, linkId) => {
    const { name, value } = e.target;
    const updatedLinks = nodeContent?.links.map((l) =>
      l.id === linkId ? { ...l, [name]: value } : l,
    );
    // updateNodeLinks(updatedLinks);
    setNodeContent({ ...nodeContent, links: updatedLinks });
    //setLinks(updatedLinks);
    if (name === 'title') {
      updateContentToContentUpdateMail({ id: linkId, title: value });
    }
  };

  /**
   *
   * @param {String} linkId ID of the Link
   * @param {String} accessType Access type of the Link (pubic, premium)
   */
  const handleResourceAccessTypeChnage = (linkId, accessType) => {
    const flag =
      nodeContent?.links.find((l) => l.id === linkId)?.accessType ===
      accessType;
    if (flag) return;
    const updatedLinks = nodeContent?.links.map((l) =>
      l.id === linkId ? { ...l, accessType: accessType } : l,
    );
    setNodeContent({ ...nodeContent, links: updatedLinks });
  };

  /**
   * Add new link to the node
   */
  const handleAddLink = async () => {
    const newLink = {
      id: Date.now(),
      title: '',
      url: '',
      type: 'article',
      accessType: 'public',
      downloadable: false,
    };
    const updatedLinks = [...nodeContent?.links, newLink];
    setNodeContent({ ...nodeContent, links: updatedLinks });
    addContentToContentUpdateMail(newLink);
  };

  /**
   *
   * @param {String} id ID of the link
   */
  const handleRemoveLink = async (id) => {
    const updatedLinks = nodeContent?.links.filter((link) => link.id !== id);
    setNodeContent({ ...nodeContent, links: updatedLinks });
    deleteContentToContentUpdateMail(id);
  };

  const changeDownloadableStatus = async (link) => {
    const currentStatus = link?.downloadable == true; // treat undefined as false
    const updatedLinks = nodeContent.links.map((l) =>
      l.id === link.id ? { ...l, downloadable: !currentStatus } : l,
    );
    setNodeContent({ ...nodeContent, links: updatedLinks });
  };

  const addContentToContentUpdateMail = (content) => {
    const nodeEntry = contentUpdatedNodeDetails.find(
      (n) => n.nodeId === selectedNode.id,
    );

    let updatedData;

    if (nodeEntry) {
      const updatedNodeEntry = {
        ...nodeEntry,
        content: [
          ...nodeEntry.content,
          { id: content.id, title: content.title },
        ],
      };

      updatedData = contentUpdatedNodeDetails.map((n) =>
        n.nodeId === selectedNode.id ? updatedNodeEntry : n,
      );
    } else {
      updatedData = [
        ...contentUpdatedNodeDetails,
        {
          nodeId: selectedNode.id,
          content: [{ id: content.id, title: content.title }],
        },
      ];
    }

    setContentUpdateNodeDetails(updatedData);
    localStorage.setItem(
      `pushEmailContentData_${roadmapId}`,
      JSON.stringify(updatedData),
    );
  };

  const updateContentToContentUpdateMail = (content) => {
    const nodeEntry = contentUpdatedNodeDetails.find(
      (n) => n.nodeId === selectedNode.id,
    );
    if (!nodeEntry) return;

    const exists = nodeEntry.content.some((c) => c.id === content.id);
    if (!exists) return;

    const updatedNodeEntry = {
      ...nodeEntry,
      content: nodeEntry.content.map((c) =>
        c.id === content.id ? { ...c, title: content.title } : c,
      ),
    };

    const updatedData = contentUpdatedNodeDetails.map((n) =>
      n.nodeId === selectedNode.id ? updatedNodeEntry : n,
    );

    setContentUpdateNodeDetails(updatedData);
    localStorage.setItem(
      `pushEmailContentData_${roadmapId}`,
      JSON.stringify(updatedData),
    );
  };

  const deleteContentToContentUpdateMail = (contentId) => {
    const nodeEntry = contentUpdatedNodeDetails.find(
      (n) => n.nodeId === selectedNode.id,
    );
    if (!nodeEntry) return;

    const exists = nodeEntry.content.some((c) => c.id === contentId);
    if (!exists) return;

    const updatedContent = nodeEntry.content.filter((c) => c.id !== contentId);
    let updatedData;
    if (updatedContent.length === 0) {
      // If no content left → remove entire node
      updatedData = contentUpdatedNodeDetails.filter(
        (n) => n.nodeId !== selectedNode.id,
      );
    } else {
      // Otherwise update just this node
      const updatedNodeEntry = {
        ...nodeEntry,
        content: updatedContent,
      };

      updatedData = contentUpdatedNodeDetails.map((n) =>
        n.nodeId === selectedNode.id ? updatedNodeEntry : n,
      );
    }

    setContentUpdateNodeDetails(updatedData);
    localStorage.setItem(
      `pushEmailContentData_${roadmapId}`,
      JSON.stringify(updatedData),
    );
  };

  const isContentPresentInContentUpdateEmail = (contentId) => {
    const nodeEntry = contentUpdatedNodeDetails.find(
      (n) => n.nodeId === selectedNode.id,
    );
    return nodeEntry
      ? nodeEntry.content.some((c) => c.id === contentId)
      : false;
  };

  return (
    <div className={styles['links-container']}>
      {nodeContent?.links.map((link) => {
        const isContentAddedToContentUpdateMail =
          isContentPresentInContentUpdateEmail(link.id);
        return (
          <div key={link.id} className={styles['add-link']}>
            <div className={styles['resource-main-ct']}>
              <div className={styles['resource-type-head']}>
                <select
                  name="type"
                  value={link.type}
                  onChange={(e) => handleLinkChange(e, link.id)}
                  className={styles['resource-type']}
                >
                  <option value="document">Document</option>
                  <option value="course">Course</option>
                  <option value="video">Video</option>
                  <option value="website">Website</option>
                  {/* <option value="document">Document</option> */}
                  <option value="data_table">Data Table</option>
                  <option value="folder">Folder</option>
                  <option value="assignment">Assignment</option>
                  <option value="notebook">Notebook</option>
                  <option value="opensource">Opensource</option>
                </select>

                <div className={styles['resource-access-type']}>
                  <div
                    className={`${styles['resource-access-type-name']} ${link?.accessType === 'public' ? styles['resource-access-type-selected'] : ''}`}
                    onClick={() =>
                      handleResourceAccessTypeChnage(link?.id, 'public')
                    }
                  >
                    Public
                  </div>
                  <div
                    className={`${styles['resource-access-type-name']} ${link?.accessType === 'premium' ? styles['resource-access-type-selected'] : ''}`}
                    onClick={() =>
                      handleResourceAccessTypeChnage(link?.id, 'premium')
                    }
                  >
                    Premium
                  </div>
                </div>
                <div
                  className={styles['downloadable-ct']}
                  onClick={() => changeDownloadableStatus(link)}
                >
                  <Image
                    src={
                      link?.downloadable === true
                        ? downloadIcon
                        : notDownloadIcon
                    }
                    alt={
                      link?.downloadable === true
                        ? 'non-downloadable'
                        : 'downloadable'
                    }
                    title={
                      link?.downloadable === true
                        ? 'non-downloadable'
                        : 'downloadable'
                    }
                  />
                </div>
              </div>

              <div className={styles['resource-ct']}>
                <Image
                  className={styles['resource-title-img']}
                  src={resourceTitleIcon}
                  alt=""
                />
                <input
                  name="title"
                  type="text"
                  placeholder="Resource Title"
                  value={link.title}
                  onChange={(e) => handleLinkChange(e, link.id)}
                  className={styles['resource-title-input']}
                />
              </div>

              <div className={styles['resource-ct']}>
                <Image
                  className={styles['resource-link-img']}
                  src={resourceLinkIcon}
                  alt=""
                />
                <input
                  name="url"
                  type="text"
                  placeholder="Resource URL"
                  value={link.url}
                  onChange={(e) => handleLinkChange(e, link.id)}
                  className={styles['resource-link-input']}
                />
              </div>
            </div>

            <div className={styles['bottom-ct']}>
              <button
                onClick={() => handleRemoveLink(link.id)}
                className={styles['remove-link-btn']}
              >
                <Image src={resourceDeleteIcon} alt="" />
                <p>Remove</p>
              </button>

              <button
                className={styles['content-update-email-ct']}
                onClick={() =>
                  isContentAddedToContentUpdateMail
                    ? deleteContentToContentUpdateMail(link.id)
                    : addContentToContentUpdateMail(link)
                }
                data-tooltip-id="push-email-tooltip"
                data-tooltip-content={
                  isContentAddedToContentUpdateMail
                    ? 'Remove From Content Update Email'
                    : 'Add to Content Update Email'
                }
                data-tooltip-place="bottom"
              >
                <Image
                  style={{ width: '24px' }}
                  src={
                    isContentAddedToContentUpdateMail
                      ? removeFromBagIcon
                      : addToBagIcon
                  }
                  alt={
                    isContentAddedToContentUpdateMail
                      ? 'remove from content update mail'
                      : 'add to content update mail'
                  }
                  title={
                    isContentAddedToContentUpdateMail
                      ? 'remove from content update mail'
                      : 'add to content update mail'
                  }
                />
                <p>{isContentAddedToContentUpdateMail ? 'Remove' : 'Add'}</p>
              </button>
            </div>
          </div>
        );
      })}

      <button onClick={handleAddLink} className={styles['add-link-btn']}>
        Add Link
      </button>
    </div>
  );
};

const AddToContentUpdateMailer = ({ nodeContent, selectedNode, roadmapId }) => {
  const { contentUpdatedNodeDetails, setContentUpdateNodeDetails } =
    useContext(RoadmapContext);

  const [isNodeAddedToPushEmail, setIsNodeAddedToPushEmail] = useState(false);

  const handleButtonClick = () => {
    if (isNodeAddedToPushEmail) {
      const updatedData = contentUpdatedNodeDetails.filter(
        (n) => n.nodeId !== selectedNode.id,
      );
      localStorage.setItem(
        `pushEmailContentData_${roadmapId}`,
        JSON.stringify(updatedData),
      );
      setContentUpdateNodeDetails(updatedData);
      setIsNodeAddedToPushEmail(false);
    } else {
      const currentContents = nodeContent?.links.map((nc) => ({
        id: nc.id,
        title: nc.title,
      }));
      const updatedData = [
        ...contentUpdatedNodeDetails,
        { nodeId: selectedNode?.id, content: currentContents },
      ];
      localStorage.setItem(
        `pushEmailContentData_${roadmapId}`,
        JSON.stringify(updatedData),
      );
      setContentUpdateNodeDetails(updatedData);
      setIsNodeAddedToPushEmail(true);
    }
  };

  useEffect(() => {
    const verdict = contentUpdatedNodeDetails.find(
      (n) => n.nodeId === selectedNode.id,
    );
    setIsNodeAddedToPushEmail(!!verdict);
  }, [selectedNode?.id, contentUpdatedNodeDetails]);

  return (
    <>
      <div
        className={styles['acum-main-ct']}
        data-tooltip-id="push-email-tooltip"
        data-tooltip-content={
          isNodeAddedToPushEmail
            ? 'Remove From Content Update Email'
            : 'Add to Content Update Email'
        }
        data-tooltip-place="bottom"
      >
        <button className={styles['acum-btn']} onClick={handleButtonClick}>
          <Image
            src={isNodeAddedToPushEmail ? removeFromBagIcon : addToBagIcon}
            alt="add to push email button"
          />
        </button>
        <p className={styles['acum-text']}>
          {isNodeAddedToPushEmail
            ? 'Remove From Content Update Email'
            : 'Add to Content Update Email'}
        </p>
      </div>
      <Tooltip
        id="push-email-tooltip"
        style={{
          backgroundColor: '#000000',
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '15px',
          fontWeight: '500',
          textAlign: 'left',
          // borderRadius: '20px',
          padding: '5px',
          zIndex: 1000,
          width: '200px',
        }}
        delayShow={500}
        className={styles['custom-tooltip-animation']}
      />
    </>
  );
};

ContentTab.propTypes = {
  selectedNode: PropTypes.object.isRequired,
  roadmapId: PropTypes.string.isRequired,
  hasPermission: PropTypes.func.isRequired,
};

ContentTitleEditor.propTypes = {
  nodeContent: PropTypes.object.isRequired,
  setNodeContent: PropTypes.func.isRequired,
};

ContentDescriptionEditor.propTypes = {
  nodeContent: PropTypes.object.isRequired,
  setNodeContent: PropTypes.func.isRequired,
};

ContentLinksEditor.propTypes = {
  selectedNode: PropTypes.object.isRequired,
  nodeContent: PropTypes.object.isRequired,
  setNodeContent: PropTypes.func.isRequired,
};

AddToContentUpdateMailer.propTypes = {
  nodeContent: PropTypes.object.isRequired,
  selectedNode: PropTypes.object.isRequired,
};

export default ContentTab;
