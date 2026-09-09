import { useArtifactStore } from '@/store/artifactStore';
import { useThreadStore } from '@/store/threadStore';
export function createThreadStreamHandlers(overrides = {}) {
  const defaultHandlers = {
    onArtifact: (artifact) => {
      const {
        setIsArtifactOpen,
        setIsRoadmapCreated,
        setAvailableArtifacts,
        setMobileTab,
      } = useThreadStore.getState();

      const { setArtifactId, setArtifactData } = useArtifactStore.getState();
      if (
        ['roadmap', 'content', 'recommended_courses'].includes(artifact.subtype)
      ) {
        console.log('Artifact : ', {
          subtype: artifact.subtype,
          data: artifact.data,
        });
        setIsArtifactOpen(true);
        setMobileTab('canvas');
        setArtifactId(artifact.artifact_id);
        setArtifactData({ subtype: artifact.subtype, data: artifact.data });
        if (artifact.subtype === 'roadmap') setIsRoadmapCreated(true);
        setAvailableArtifacts((prev) => [
          ...prev,
          {
            title: artifact.data.name,
            a_id: artifact.artifact_id,
            version_tag: artifact.data.version.version_tag,
          },
        ]);
      }
    },
  };
  return { ...defaultHandlers, ...overrides };
}
