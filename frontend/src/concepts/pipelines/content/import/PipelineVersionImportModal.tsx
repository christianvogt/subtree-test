/* eslint-disable camelcase */
import * as React from 'react';
import { FormGroup, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import { getNameEqualsFilter } from '~/concepts/pipelines/utils';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';
import { pipelineVersionDetailsRoute } from '~/routes';
import { generatePipelineVersionName, PipelineUploadOption } from './utils';
import { usePipelineVersionImportModalData } from './useImportModalData';
import PipelineImportBase from './PipelineImportBase';

type PipelineVersionImportModalProps = {
  existingPipeline?: PipelineKF | null;
  onClose: (pipelineVersion?: PipelineVersionKF, pipeline?: PipelineKF | null) => void;
};

const eventName = 'Pipeline Version Updated';
const PipelineVersionImportModal: React.FC<PipelineVersionImportModalProps> = ({
  existingPipeline,
  onClose,
}) => {
  const { api, namespace } = usePipelinesAPI();
  const navigate = useNavigate();
  const [modalData, setData, resetData] = usePipelineVersionImportModalData(existingPipeline);

  const handleClose = React.useCallback(
    async (result?: PipelineKF | PipelineVersionKF | undefined, pipeline?: PipelineKF | null) => {
      if (!pipeline) {
        fireFormTrackingEvent(eventName, { outcome: TrackingOutcome.cancel });
      }

      if (result && 'pipeline_version_id' in result && pipeline) {
        onClose(result, pipeline);
        navigate(
          pipelineVersionDetailsRoute(namespace, pipeline.pipeline_id, result.pipeline_version_id),
        );
      } else {
        onClose();
      }
    },
    [namespace, navigate, onClose],
  );

  const checkForDuplicateName = React.useCallback(
    async (value: string) => {
      if (modalData.pipeline?.pipeline_id && value) {
        const { pipeline_versions: duplicateVersions } = await api.listPipelineVersions(
          {},
          modalData.pipeline.pipeline_id,
          getNameEqualsFilter(value),
        );

        if (duplicateVersions?.length) {
          return true;
        }
      }
      return false;
    },
    [api, modalData.pipeline?.pipeline_id],
  );
  const submitAction = React.useCallback(() => {
    const { name, description, fileContents, pipelineUrl, uploadOption, pipeline } = modalData;
    const pipelineId = pipeline?.pipeline_id || '';

    fireFormTrackingEvent(eventName, {
      outcome: TrackingOutcome.submit,
      mode: uploadOption === PipelineUploadOption.FILE_UPLOAD ? 'file' : 'url',
    });

    if (uploadOption === PipelineUploadOption.FILE_UPLOAD) {
      return api.uploadPipelineVersion({}, name, description, fileContents, pipelineId);
    }
    return api.createPipelineVersion({}, pipelineId, {
      pipeline_id: pipelineId,
      display_name: name,
      description,
      package_url: {
        pipeline_url: pipelineUrl,
      },
    });
  }, [api, modalData]);

  return (
    <PipelineImportBase
      title="Upload new version"
      submitButtonText="Upload"
      onClose={handleClose}
      data={modalData}
      setData={setData}
      resetData={resetData}
      submitAction={submitAction}
      checkForDuplicateName={checkForDuplicateName}
    >
      <StackItem>
        <FormGroup label="Pipeline" isRequired fieldId="pipeline-selection">
          <PipelineSelector
            selection={modalData.pipeline?.display_name || ''}
            onSelect={(newPipeline) => {
              setData('pipeline', newPipeline);
              setData('name', generatePipelineVersionName(newPipeline));
            }}
          />
        </FormGroup>
      </StackItem>
    </PipelineImportBase>
  );
};

export default PipelineVersionImportModal;
