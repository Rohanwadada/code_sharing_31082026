import html2canvas from 'html2canvas';
import { addCopyright } from './helper';
import jsPDF from 'jspdf';

export const getRoadmapAttachment = async (format, fileName = 'Roadmap') => {
  // setIsDownloadingRoadmap(true);
  // const toastId = uuid4();
  // showLoadingNotification(toastId, "Downloading roadmap. Please wait");

  try {
    // Get the original roadmap element
    const roadmapElement = document.getElementById('react-flow-wrapper');
    const knowledgeLegendElement = document.getElementById(
      'knowledge-level-legend',
    );

    // Create a hidden container for rendering
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'fixed';
    hiddenContainer.style.top = '0';
    hiddenContainer.style.left = '0';
    hiddenContainer.style.zIndex = '999999'; // Hide it off-screen instead of visible with high z-index
    hiddenContainer.style.display = 'flex';
    hiddenContainer.style.flexDirection = 'column';
    hiddenContainer.style.justifyContent = 'center';
    hiddenContainer.style.gap = '10px';
    hiddenContainer.style.pointerEvents = 'none';
    hiddenContainer.style.opacity = '0';

    document.body.appendChild(hiddenContainer);

    // Clone the roadmap element
    const clone = roadmapElement.cloneNode(true);
    const knowledgeLevelLegendClone = knowledgeLegendElement.cloneNode(true);

    // Get the actual svg element inside the clone
    const svgElement = clone.querySelector('svg');
    if (!svgElement) {
      console.error('SVG element not found in the roadmap');
      return;
    }

    // Get the original dimensions and calculate aspect ratio
    const originalWidth =
      svgElement.viewBox.baseVal.width || svgElement.width.baseVal.value;
    const originalHeight =
      svgElement.viewBox.baseVal.height || svgElement.height.baseVal.value;
    const aspectRatio = originalHeight / originalWidth;

    // Set the fixed width and calculate proportional height
    const targetWidth = 1200;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    // Configure the container with the target dimensions
    hiddenContainer.style.width = `${targetWidth}px`;
    hiddenContainer.style.height = `${targetHeight + 200}px`;

    // Configure the clone for proper rendering
    clone.style.width = `${targetWidth}px`;
    clone.style.height = `${targetHeight}px`;
    clone.style.transform = 'scale(1)'; // Reset any scaling
    clone.style.display = 'block';
    clone.style.overflow = 'visible';
    clone.style.padding = '5px';

    // Remove unwanted elements
    const elementsToRemove = clone.querySelectorAll(
      '#knowledge-level-legend, #progress-status-div',
    );
    elementsToRemove.forEach((el) => el.remove());

    // Fix any label width issues
    const elementToUpdate = clone.querySelectorAll('#node-lable-ct');
    elementToUpdate.forEach((el) => (el.style.width = '100%'));

    knowledgeLevelLegendClone.style.width = '100%';
    knowledgeLevelLegendClone.style.margin = '20px';
    knowledgeLevelLegendClone.style.justifyContent = 'flex-start';
    const knlLeft = knowledgeLevelLegendClone.querySelectorAll('#knl_left');
    const knlRight = knowledgeLevelLegendClone.querySelectorAll('#knl_right');
    knlLeft.forEach(
      (kl) => ((kl.style.height = '16px'), (kl.style.width = '16px')),
    );
    knlRight.forEach((kr) => (kr.style.fontSize = '16px'));

    // Watermark Text
    // addWatermark(clone, 'SETU ROADMAPS');

    // Add the clone to the hidden container
    hiddenContainer.appendChild(knowledgeLevelLegendClone);
    hiddenContainer.appendChild(clone);

    // Force layout calculation (in a way that won't trigger ESLint)
    const _ = hiddenContainer.getBoundingClientRect(); // This forces a layout recalculation

    // Copyright Text at Bottom
    addCopyright(hiddenContainer);

    // Convert to image with the exact dimensions
    const canvas = await html2canvas(hiddenContainer, {
      allowTaint: true,
      backgroundColor: '#fff',
      useCORS: true,
      foreignObjectRendering: true,
      width: targetWidth,
      height: targetHeight + 200,
      scale: 2,
    });

    // Remove the hidden container after rendering
    document.body.removeChild(hiddenContainer);

    if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/jpeg');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        compress: true,
      });

      pdf.addImage(imgData, 'JEPG', 0, 0, canvas.width, canvas.height);
      // pdf.save(`${roadmapTitle}.pdf`);

      const pdfBlob = pdf.output('blob');

      const file = new File([pdfBlob], `${fileName}.${format}`, {
        type: 'application/pdf',
        lastModified: new Date().getTime(),
      });
      return file;
    }
    // else {
    //   const link = document.createElement("a");
    //   link.href = canvas.toDataURL(`image/${format}`);
    //   link.download = `${roadmapTitle}.${format}`;
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
    // }

    // resolveNotification(toastId, "Downloaded successfully");
  } catch (error) {
    console.error('Error in html2canvas:', error);
    // rejectNotification(toastId, "Something went wrong. Please try again");
  } finally {
    // setIsDownloadingRoadmap(false);
  }
};
